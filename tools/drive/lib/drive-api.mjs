// Read-only Google Drive API v3 client.
// Only HTTP GET is ever issued: there is no code path here that can create, change or delete
// anything in Drive. The token is requested with the drive.readonly scope (ADR-0008), so even a
// bug elsewhere cannot write.

const API = 'https://www.googleapis.com/drive/v3';

export const FOLDER = 'application/vnd.google-apps.folder';
export const SHORTCUT = 'application/vnd.google-apps.shortcut';
export const GOOGLE_NATIVE_PREFIX = 'application/vnd.google-apps.';

const ID_RE = /^[A-Za-z0-9_-]{10,}$/;

export class DriveError extends Error {
  constructor(status, path, body) {
    super(`Drive API ${status} on ${path}: ${hint(status)}\n${String(body).slice(0, 500)}`);
    this.status = status;
  }
}

function hint(status) {
  if (status === 401) return 'the access token is missing or expired.';
  if (status === 403)
    return 'access denied. Is the Google Drive API enabled in the GCP project, and is the folder shared with the service account?';
  if (status === 404) return 'not found, or not shared with the service account (link sharing is not enough).';
  if (status === 429) return 'rate limited; re-run the workflow later.';
  return 'unexpected response.';
}

export function assertDriveId(id, what = 'Drive ID') {
  if (typeof id !== 'string' || !ID_RE.test(id)) throw new Error(`${what} is not a valid Drive ID: ${JSON.stringify(id)}`);
  return id;
}

export function createDriveClient({ token, fetchImpl = globalThis.fetch }) {
  if (!token) throw new Error('Drive access token is empty: set GOOGLE_OAUTH_ACCESS_TOKEN (see ADR-0008).');

  async function get(path, params = {}) {
    const url = new URL(API + path);
    for (const [k, v] of Object.entries({ supportsAllDrives: 'true', ...params })) url.searchParams.set(k, String(v));
    const res = await fetchImpl(url, { method: 'GET', headers: { authorization: `Bearer ${token}` } });
    if (!res.ok) throw new DriveError(res.status, path, await res.text());
    return res.json();
  }

  return {
    getFile(id, fields) {
      return get(`/files/${assertDriveId(id)}`, { fields });
    },

    async listChildren(folderId, fields) {
      assertDriveId(folderId, 'Folder ID');
      const files = [];
      let pageToken;
      do {
        const page = await get('/files', {
          q: `'${folderId}' in parents and trashed = false`,
          fields: `nextPageToken,files(${fields})`,
          pageSize: 1000,
          includeItemsFromAllDrives: 'true',
          ...(pageToken ? { pageToken } : {}),
        });
        files.push(...(page.files ?? []));
        pageToken = page.nextPageToken;
      } while (pageToken);
      return files;
    },
  };
}
