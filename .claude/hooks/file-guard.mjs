#!/usr/bin/env node
// PreToolUse guard for file tools (ADR-0014): Read, Grep, Edit, Write, MultiEdit, NotebookEdit.
//   - secrets: vendored protect-secrets (level "high") for reads and writes;
//   - Actions-only DS files (design-system/source/**, lock, inventory) are never written by the session;
//   - frozen versions (ADR-0010) and generated files (pnpm-lock.yaml) are never edited by hand;
//   - the prototype-builder subagent writes only inside prototypes/ (file ownership, ADR-0014).
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import {
  ACTIONS_ONLY,
  GENERATED,
  block,
  frozenReason,
  frozenVersionOf,
  projectDir,
  readEvent,
  repoPath,
  runGuard,
} from './lib/repo.mjs';

const require = createRequire(import.meta.url);
const secrets = require('./vendor/protect-secrets.cjs');

const WRITE_TOOLS = new Set(['Edit', 'Write', 'MultiEdit', 'NotebookEdit']);
/** Subagents that may write only under these repository paths. */
const OWNERSHIP = { 'prototype-builder': [/^prototypes\//] };

/**
 * @param {string} toolName
 * @param {Record<string, any>} input
 * @param {{ root: string, agentType?: string }} ctx
 * @returns {string | null}
 */
export function evaluate(toolName, input, ctx) {
  const file = input?.file_path ?? input?.notebook_path;
  if (toolName === 'Grep' || toolName === 'Read' || WRITE_TOOLS.has(toolName)) {
    const s = toolName === 'Grep' ? secrets.check('Grep', input, 'high') : secrets.checkFilePath(file, 'high');
    if (s.blocked) return `[${s.pattern.id}] ${s.pattern.reason}.`;
  }
  if (!WRITE_TOOLS.has(toolName)) return null;

  const rel = repoPath(ctx.root, file);
  if (rel === null) return null; // outside the project (scratchpad etc.)
  if (ACTIONS_ONLY.some((re) => re.test(rel))) {
    return `${rel} is written only by GitHub Actions (ds-sync, ADR-0013). Change the source in Proto/DS and run ds-sync.`;
  }
  const generated = GENERATED.find((g) => g.re.test(rel));
  if (generated) return `${rel} is generated: change it with ${generated.how}, not by hand.`;
  if (/(^|\/)\.frozen(\/|$)/.test(rel)) return `${rel} is a frozen build snapshot (ADR-0010) and is immutable.`;
  const frozen = frozenVersionOf(ctx.root, rel);
  if (frozen) return frozenReason(frozen);

  const owned = ctx.agentType ? /** @type {Record<string, RegExp[]>} */ (OWNERSHIP)[ctx.agentType] : undefined;
  if (owned && !owned.some((re) => re.test(rel))) {
    return `${ctx.agentType} may write only inside ${owned.map(String).join(', ')}; ${rel} belongs to the main session. Report the needed change instead.`;
  }
  return null;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runGuard('file-guard', async () => {
    const event = await readEvent();
    const reason = evaluate(event.tool_name, event.tool_input ?? {}, {
      root: projectDir(event),
      agentType: event.agent_type,
    });
    if (reason) block('file-guard', reason);
  });
}
