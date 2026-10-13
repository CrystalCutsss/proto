#!/usr/bin/env node
// PreToolUse guard for Google Drive / Google Docs connector tools (ADR-0003, ADR-0004).
// Policy (fail-closed):
//   - read-only tools are allowed;
//   - writes are allowed only inside Proto/Docs, using IDs registered in config/drive.json;
//   - DS (and anything not registered) can never be written, shared, copied, moved or trashed;
//   - one bootstrap exception: creating the "Docs" folder directly under Proto while it is not registered yet.
// Exit 2 blocks the call; stderr is shown to Claude as the reason.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const READ_TOOLS = new Set([
  'get_file_metadata',
  'get_file_permissions',
  'search_files',
  'list_recent_files',
  'read_file_content',
  'download_file_content',
  'read_doc',
]);
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const PARENT_KEYS = ['parentId', 'parent', 'parentFolderId', 'folderId', 'parents', 'addParents'];
const TARGET_KEYS = ['fileId', 'documentId', 'id'];
// For update_file a parentId means "move the file" (connector schema), so it is a move key there.
const MOVE_KEYS = ['parentId', 'addParents', 'removeParents', 'parents'];
const ID_KEYS = [...new Set([...PARENT_KEYS, ...TARGET_KEYS, ...MOVE_KEYS, 'sourceFileId', 'fileIds'])];

export function loadConfig(projectDir) {
  return JSON.parse(readFileSync(join(projectDir, 'config', 'drive.json'), 'utf8'));
}

function asList(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value.flatMap(asList);
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function collect(input, keys) {
  return keys.flatMap((key) => asList(input?.[key]));
}

function allIdsIn(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => allIdsIn(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => allIdsIn(v, out));
  return out;
}

// Returns null when the call is allowed, or a human-readable reason when it must be blocked.
export function evaluate(toolName, input, config) {
  const match = /^mcp__(Google_[A-Za-z0-9_]+?)__(.+)$/.exec(toolName ?? '');
  if (!match) return null; // not a Google connector tool
  const tool = match[2];
  if (READ_TOOLS.has(tool)) return null;

  const docs = config.docs ?? {};
  const docsFolders = [docs.folderId, ...Object.values(docs.folders ?? {})].filter(Boolean);
  const docsFiles = Object.values(docs.files ?? {}).filter(Boolean);
  const protected_ = [config.dsFolderId].filter(Boolean);

  // DS is untouchable: any write-capable call that targets the DS ID in an ID-bearing field is blocked.
  // Content fields are not inspected (a document may legitimately mention the DS ID in its text).
  const mentioned = allIdsIn(ID_KEYS.map((key) => input?.[key]));
  if (mentioned.some((id) => protected_.some((p) => id.includes(p)))) {
    return 'DS folder is read-only (ADR-0004): writes, copies, moves and sharing that touch DS are forbidden.';
  }

  if (tool === 'create_file') {
    const parents = collect(input, PARENT_KEYS);
    if (parents.length === 0) {
      return 'create_file must set an explicit parent folder inside Proto/Docs (config/drive.json → docs).';
    }
    const isBootstrap =
      !docs.folderId &&
      parents.length === 1 &&
      parents[0] === config.protoFolderId &&
      (input?.contentMimeType ?? input?.mimeType) === FOLDER_MIME &&
      (input?.title ?? input?.name) === (docs.folderName ?? 'Docs');
    if (isBootstrap) return null;
    if (parents.every((p) => docsFolders.includes(p))) return null;
    return `create_file is allowed only inside Proto/Docs folders registered in config/drive.json (got parent ${parents.join(', ')}).`;
  }

  if (tool === 'update_file' || tool === 'update_doc') {
    if (collect(input, MOVE_KEYS).length > 0) {
      return `${tool} must not move files between folders.`;
    }
    const targets = collect(input, TARGET_KEYS);
    if (targets.length > 0 && targets.every((t) => docsFiles.includes(t) || docsFolders.includes(t))) {
      return null;
    }
    return `${tool} is allowed only for Proto/Docs files and folders registered in config/drive.json (got ${targets.join(', ') || 'no file ID'}).`;
  }

  return `${toolName} is not allowed: only read tools, create_file in Proto/Docs and updates of registered Docs files are permitted (ADR-0004).`;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const event = JSON.parse(raw);
  const projectDir = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
  const reason = evaluate(event.tool_name, event.tool_input ?? {}, loadConfig(projectDir));
  if (reason) {
    process.stderr.write(`drive-guard: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`drive-guard: internal error, blocking for safety: ${err.message}\n`);
    process.exit(2);
  });
}
