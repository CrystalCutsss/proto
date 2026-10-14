#!/usr/bin/env node
// PreToolUse guard for Figma MCP tools (ADR-0016): Figma is read-only.
// Policy (fail-closed allowlist): a tool of any Figma server (claude.ai connector `mcp__Figma__*`, the Figma
// plugin `mcp__plugin_figma_figma__*`, …) runs only if it is a known read tool. Everything else — tools that
// write to Figma, spend AI credits, and any tool Figma adds later — is blocked until it is reviewed and listed
// here. The deny list in .claude/settings.json stays as a second layer.
// Exit 2 blocks the call; stderr is shown to Claude as the reason.
import { pathToFileURL } from 'node:url';

export const READ_TOOLS = new Set([
  'whoami',
  'get_metadata',
  'get_design_context',
  'get_screenshot',
  'get_variable_defs',
  'get_motion_context',
  'get_figjam',
  'get_libraries',
  'search_design_system',
  'download_assets',
  'export_video',
  'get_code_connect_map',
  'get_context_for_code_connect',
  'list_file_components_for_code_connect',
  'get_figma_skill',
  'get_shader',
  'list_shaders',
  'list_file_shaders',
  'get_generative_plugin',
  'list_generative_plugins',
  'weave_list_tools',
  'weave_find_model',
  'weave_get_tool_inputs',
  'weave_get_tool_run_output',
  'weave_get_model_run_output',
]);

/**
 * Returns null when the call is allowed, or a reason when it must be blocked.
 * @param {string | undefined} toolName
 */
export function evaluate(toolName) {
  const match = /^mcp__([^_]\w*?)__(.+)$/.exec(toolName ?? '');
  if (!match || !/figma/i.test(match[1] ?? '')) return null; // not a Figma tool
  const tool = match[2] ?? '';
  if (READ_TOOLS.has(tool)) return null;
  return `${toolName} is not allowed: Figma is read-only (ADR-0016). Only reviewed read tools run; a new read tool must be added to READ_TOOLS in .claude/hooks/figma-guard.mjs with the owner's approval.`;
}

async function main() {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const event = JSON.parse(raw);
  const reason = evaluate(event.tool_name);
  if (reason) {
    process.stderr.write(`figma-guard: ${reason}\n`);
    process.exit(2);
  }
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    process.stderr.write(`figma-guard: internal error, blocking for safety: ${err.message}\n`);
    process.exit(2);
  });
}
