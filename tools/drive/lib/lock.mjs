// source.lock.json: what ds-sync copied from DS, built from `rclone lsjson` output.
// ds-check compares a fresh listing with the lock to detect drift.

export function normalizeLsjson(entries, { maxFileSizeBytes }) {
  const files = [];
  const skipped = [];
  for (const e of entries) {
    if (e.IsDir) continue;
    const f = { path: e.Path, id: e.ID ?? null, size: e.Size, mimeType: e.MimeType ?? null, modTime: e.ModTime };
    if (e.Hashes?.md5) f.md5 = e.Hashes.md5;
    (e.Size > maxFileSizeBytes ? skipped : files).push(f);
  }
  const byPath = (a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  return { files: files.sort(byPath), skipped: skipped.sort(byPath) };
}

export function buildLock(dsFolderId, files) {
  return { schemaVersion: 1, source: { dsFolderId }, files };
}

function sameContent(a, b) {
  if (a.md5 && b.md5) return a.md5 === b.md5;
  // Google Docs/Sheets/Slides have no md5 and size -1: fall back to modification time.
  return a.size === b.size && a.modTime === b.modTime;
}

export function diffLock(lockFiles, currentFiles) {
  const old = new Map(lockFiles.map((f) => [f.path, f]));
  const cur = new Map(currentFiles.map((f) => [f.path, f]));
  let added = currentFiles.filter((f) => !old.has(f.path));
  let removed = lockFiles.filter((f) => !cur.has(f.path));
  const changed = currentFiles.filter((f) => old.has(f.path) && !sameContent(old.get(f.path), f)).map((f) => f.path);

  const moved = [];
  const addedById = new Map(added.filter((f) => f.id).map((f) => [f.id, f]));
  for (const r of removed) {
    const a = r.id && addedById.get(r.id);
    if (a) moved.push({ from: r.path, to: a.path });
  }
  const movedFrom = new Set(moved.map((m) => m.from));
  const movedTo = new Set(moved.map((m) => m.to));
  added = added.filter((f) => !movedTo.has(f.path)).map((f) => f.path);
  removed = removed.filter((f) => !movedFrom.has(f.path)).map((f) => f.path);

  return { added, removed, changed, moved, clean: !added.length && !removed.length && !changed.length && !moved.length };
}

export function renderDiffMarkdown(diff, { title = 'DS drift' } = {}) {
  if (diff.clean) return `## ${title}\n\nDS in Drive matches design-system/source.lock.json.\n`;
  const lines = [`## ${title}`, ''];
  const section = (name, list, fmt = (x) => `\`${x}\``) => {
    if (!list.length) return;
    lines.push(`### ${name} (${list.length})`, '', ...list.slice(0, 100).map((x) => `- ${fmt(x)}`));
    if (list.length > 100) lines.push(`- … and ${list.length - 100} more`);
    lines.push('');
  };
  section('Added', diff.added);
  section('Changed', diff.changed);
  section('Removed', diff.removed);
  section('Moved or renamed', diff.moved, (m) => `\`${m.from}\` → \`${m.to}\``);
  return lines.join('\n');
}
