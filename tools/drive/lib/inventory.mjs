// Inventory of the DS folder: every item with type, size, checksum and access flags.
// Output is deterministic (sorted, no timestamps of the run) so an unchanged DS produces no diff.
import { FOLDER, SHORTCUT, GOOGLE_NATIVE_PREFIX } from './drive-api.mjs';

export const ITEM_FIELDS =
  'id,name,mimeType,size,md5Checksum,modifiedTime,version,shortcutDetails,' +
  'copyRequiresWriterPermission,downloadRestrictions,capabilities(canDownload,canEdit)';

const MAX_DEPTH = 32;

export async function walkTree(client, rootId) {
  const items = [];
  const seen = new Set([rootId]);
  async function walk(folderId, prefix, depth) {
    if (depth > MAX_DEPTH) throw new Error(`DS is nested deeper than ${MAX_DEPTH} levels at ${prefix}`);
    const children = await client.listChildren(folderId, ITEM_FIELDS);
    for (const f of children) {
      const path = prefix ? `${prefix}/${f.name}` : f.name;
      items.push({ ...f, path });
      if (f.mimeType === FOLDER && !seen.has(f.id)) {
        seen.add(f.id);
        await walk(f.id, path, depth + 1);
      }
    }
  }
  await walk(rootId, '', 0);
  return items;
}

function kindOf(f) {
  if (f.mimeType === FOLDER) return 'folder';
  if (f.mimeType === SHORTCUT) return 'shortcut';
  if (f.mimeType.startsWith(GOOGLE_NATIVE_PREFIX)) return 'google-native';
  return 'file';
}

function isDownloadRestricted(f) {
  const eff = f.downloadRestrictions?.effectiveDownloadRestrictionWithContext;
  return Boolean(f.copyRequiresWriterPermission || eff?.restrictedForReaders || f.capabilities?.canDownload === false);
}

export function buildInventory(root, rawItems, { maxFileSizeBytes }) {
  const items = rawItems
    .map((f) => {
      const kind = kindOf(f);
      const item = { path: f.path, kind, id: f.id, mimeType: f.mimeType };
      if (f.size !== undefined) item.size = Number(f.size);
      if (f.md5Checksum) item.md5 = f.md5Checksum;
      if (f.modifiedTime) item.modifiedTime = f.modifiedTime;
      if (f.version) item.version = f.version;
      if (kind === 'shortcut') item.shortcutTarget = f.shortcutDetails?.targetId ?? null;
      if (kind !== 'folder' && isDownloadRestricted(f)) item.downloadRestricted = true;
      if (f.capabilities?.canEdit) item.serviceAccountCanEdit = true;
      if (kind === 'file' && item.size > maxFileSizeBytes) item.overSizeLimit = true;
      return item;
    })
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const byMimeType = {};
  let totalBytes = 0;
  const count = { folder: 0, file: 0, 'google-native': 0, shortcut: 0 };
  for (const it of items) {
    count[it.kind] += 1;
    if (it.kind !== 'folder') byMimeType[it.mimeType] = (byMimeType[it.mimeType] ?? 0) + 1;
    totalBytes += it.size ?? 0;
  }
  return {
    schemaVersion: 1,
    root: { id: root.id, name: root.name },
    summary: {
      folders: count.folder,
      files: count.file,
      googleNative: count['google-native'],
      shortcuts: count.shortcut,
      totalBytes,
      byMimeType: Object.fromEntries(Object.entries(byMimeType).sort(([a], [b]) => (a < b ? -1 : 1))),
      downloadRestricted: items.filter((i) => i.downloadRestricted).length,
      overSizeLimit: items.filter((i) => i.overSizeLimit).length,
      maxFileSizeBytes,
    },
    items,
  };
}

const MiB = 1024 * 1024;

export function renderInventoryMarkdown(inv) {
  const s = inv.summary;
  const lines = [
    `## DS inventory: ${inv.root.name}`,
    '',
    `Folders: ${s.folders}. Files: ${s.files}. Google Docs/Sheets/Slides: ${s.googleNative}. Shortcuts: ${s.shortcuts}. ` +
      `Total size: ${(s.totalBytes / MiB).toFixed(1)} MiB.`,
    '',
    '| MIME type | Count |',
    '|---|---|',
    ...Object.entries(s.byMimeType).map(([m, n]) => `| \`${m}\` | ${n} |`),
    '',
  ];
  const flagged = [
    ['Shortcuts (not followed by sync)', inv.items.filter((i) => i.kind === 'shortcut')],
    ['Download restricted for readers (sync will fail on these)', inv.items.filter((i) => i.downloadRestricted)],
    [`Larger than ${(s.maxFileSizeBytes / MiB).toFixed(0)} MiB (skipped by sync)`, inv.items.filter((i) => i.overSizeLimit)],
    ['Service account can edit (share should be Viewer)', inv.items.filter((i) => i.serviceAccountCanEdit)],
  ];
  for (const [title, list] of flagged) {
    if (!list.length) continue;
    lines.push(`### ${title}`, '', ...list.slice(0, 50).map((i) => `- \`${i.path}\``));
    if (list.length > 50) lines.push(`- … and ${list.length - 50} more`);
    lines.push('');
  }
  return lines.join('\n');
}
