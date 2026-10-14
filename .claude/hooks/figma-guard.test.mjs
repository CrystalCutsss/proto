// Run: node --test .claude/hooks/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { READ_TOOLS, evaluate } from './figma-guard.mjs';

test('non-Figma tools are ignored', () => {
  assert.equal(evaluate('Bash'), null);
  assert.equal(evaluate('mcp__Google_Drive__create_file'), null);
  assert.equal(evaluate(undefined), null);
});

test('reviewed read tools run on every Figma server', () => {
  for (const server of ['Figma', 'plugin_figma_figma']) {
    for (const tool of ['get_design_context', 'get_screenshot', 'get_metadata', 'download_assets']) {
      assert.equal(evaluate(`mcp__${server}__${tool}`), null, `${server}/${tool}`);
    }
  }
  assert.ok(READ_TOOLS.size > 10);
});

test('write, paid and unknown tools are blocked', () => {
  for (const tool of [
    'use_figma',
    'generate_figma_design',
    'create_new_file',
    'upload_assets',
    'generate_image',
    'html_to_figma',
    'send_code_connect_mappings',
    'weave_run_model',
    'some_future_write_tool',
  ]) {
    assert.match(evaluate(`mcp__Figma__${tool}`) ?? '', /read-only/, tool);
    assert.match(evaluate(`mcp__plugin_figma_figma__${tool}`) ?? '', /read-only/, tool);
  }
});

test('the hook process exits 2 with a reason when blocking', () => {
  const hook = join(dirname(fileURLToPath(import.meta.url)), 'figma-guard.mjs');
  const run = (tool_name) => spawnSync('node', [hook], { input: JSON.stringify({ tool_name }), encoding: 'utf8' });
  const blocked = run('mcp__Figma__use_figma');
  assert.equal(blocked.status, 2);
  assert.match(blocked.stderr, /figma-guard: .*read-only/);
  assert.equal(run('mcp__Figma__get_screenshot').status, 0);
  assert.equal(spawnSync('node', [hook], { input: 'not json', encoding: 'utf8' }).status, 2);
});
