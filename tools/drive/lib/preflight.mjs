// Preflight: verify the Drive layout and the service account's access before any workflow reads data.
// Fails on layout errors; warns loudly if the service account could modify Proto or DS.
import { FOLDER, SHORTCUT } from './drive-api.mjs';

export const META_FIELDS =
  'id,name,mimeType,parents,driveId,trashed,ownedByMe,shortcutDetails,' +
  'capabilities(canEdit,canAddChildren,canDelete,canTrash,canShare,canListChildren,canDownload)';

const WRITE_CAPS = ['canEdit', 'canAddChildren', 'canDelete', 'canTrash', 'canShare'];

function writeCaps(file) {
  return WRITE_CAPS.filter((c) => file.capabilities?.[c]);
}

export async function preflight(client, cfg) {
  const errors = [];
  const warnings = [];
  const result = { errors, warnings, proto: null, ds: null, inbox: null };

  try {
    result.proto = await client.getFile(cfg.protoFolderId, META_FIELDS);
  } catch (e) {
    errors.push(`Proto (${cfg.protoFolderId}) is not readable: ${e.message}`);
    return result;
  }
  try {
    result.ds = await client.getFile(cfg.dsFolderId, META_FIELDS);
  } catch (e) {
    errors.push(`DS (${cfg.dsFolderId}) is not readable: ${e.message}`);
    return result;
  }
  const { proto, ds } = result;

  if (proto.mimeType !== FOLDER) errors.push(`Proto is not a folder (mimeType ${proto.mimeType}).`);
  if (ds.mimeType === SHORTCUT) {
    errors.push(
      `DS is a shortcut to ${ds.shortcutDetails?.targetId}. Put the real DS folder inside Proto, ` +
        'or set dsFolderId in config/drive.json to the shortcut target.',
    );
  } else if (ds.mimeType !== FOLDER) {
    errors.push(`DS is not a folder (mimeType ${ds.mimeType}).`);
  }
  if (proto.trashed || ds.trashed) errors.push('Proto or DS is in the trash.');
  if (!(ds.parents ?? []).includes(proto.id)) {
    errors.push(`DS is not directly inside Proto (DS parents: ${JSON.stringify(ds.parents ?? [])}).`);
  }
  if (proto.capabilities?.canListChildren === false || ds.capabilities?.canListChildren === false) {
    errors.push('The service account cannot list folder contents.');
  }

  for (const [label, file] of [
    ['Proto', proto],
    ['DS', ds],
  ]) {
    const caps = writeCaps(file);
    if (caps.length) {
      warnings.push(
        `The service account has write capabilities on ${label}: ${caps.join(', ')}. ` +
          'Downgrade its share to Viewer. Workflows still cannot write (drive.readonly scope).',
      );
    }
  }
  if (ds.driveId) warnings.push(`DS is on a shared drive (${ds.driveId}); shared-drive permissions apply.`);

  if (!errors.length) {
    const children = await client.listChildren(proto.id, 'id,name,mimeType');
    result.inbox = children.find((f) => f.name === cfg.inboxFolderName && f.mimeType === FOLDER) ?? null;
    if (!result.inbox) {
      warnings.push(`Proto has no "${cfg.inboxFolderName}" folder; the drive-inbox workflow will not find inputs.`);
    }
  }
  return result;
}

export function renderPreflightMarkdown(r) {
  const lines = ['## Drive preflight', ''];
  if (r.proto) lines.push(`- Proto: ${r.proto.name} (\`${r.proto.id}\`)`);
  if (r.ds) lines.push(`- DS: ${r.ds.name} (\`${r.ds.id}\`), write capabilities: ${writeCaps(r.ds).join(', ') || 'none'}`);
  if (r.inbox) lines.push(`- Inbox: ${r.inbox.name} (\`${r.inbox.id}\`)`);
  for (const e of r.errors) lines.push(`- ❌ ${e}`);
  for (const w of r.warnings) lines.push(`- ⚠️ ${w}`);
  if (!r.errors.length && !r.warnings.length) lines.push('- ✅ All checks passed.');
  return lines.join('\n') + '\n';
}
