// Main page (Figma "main" 22:842): prototype cards with "Открыть" and "Changelog". The changelog opens in a
// full-screen modal dialog over main; its state lives in the URL hash (#changelog=<slug>) so it can be linked
// and closed with the browser's Back button.
import '@proto/ui/ui.css';
import './hub.css';
import type { RegistryPrototype } from '@proto/registry';
import {
  cardMeta,
  esc,
  loadRegistry,
  STATUS_LABEL,
  versionsNewestFirst,
  viewerUrl,
  visiblePrototypes,
} from './data.ts';

const list = document.querySelector<HTMLElement>('#list')!;
const dialog = document.querySelector<HTMLDialogElement>('#changelog')!;
const dialogTitle = dialog.querySelector<HTMLElement>('#changelog-title')!;
const versionsList = dialog.querySelector<HTMLElement>('#versions')!;

let prototypes: RegistryPrototype[] = [];
let trigger: HTMLElement | null = null;

const card = (p: RegistryPrototype) => `<article class="hub-card">
    <div class="hub-card-text">
      <h2 class="hub-card-title">${esc(p.title)}</h2>
      <p class="hub-card-meta">${esc(cardMeta(p))}</p>
    </div>
    <div class="hub-card-actions">
      <a class="ds-button" data-variant="glass" href="${esc(viewerUrl(p))}">Открыть</a>
      <button type="button" class="ds-button" data-variant="glass" data-changelog="${esc(p.slug)}"
        aria-haspopup="dialog" aria-label="Changelog: ${esc(p.title)}">Changelog</button>
    </div>
  </article>`;

const versionItem =
  (p: RegistryPrototype) => (v: RegistryPrototype['versions'][number]) => `<li class="hub-card hub-version">
    <div class="hub-card-text">
      <h3 class="hub-card-title">${esc(v.version)}${v.title ? ` — ${esc(v.title)}` : ''}</h3>
      <p class="hub-card-meta">${esc(v.date)} · ${esc(STATUS_LABEL[v.status] ?? v.status)} · ${esc(v.author)}</p>
      ${v.changelog.length ? `<ul class="hub-changelog">${v.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    </div>
    <div class="hub-card-actions">
      <a class="ds-button" data-variant="glass" href="${esc(viewerUrl(p, v.version))}">Открыть ${esc(v.version)}</a>
    </div>
  </li>`;

const slugFromHash = () => /^#changelog=([a-z0-9-]+)$/.exec(location.hash)?.[1] ?? null;

function openDialog(p: RegistryPrototype) {
  dialogTitle.textContent = p.title;
  versionsList.innerHTML = versionsNewestFirst(p).map(versionItem(p)).join('');
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  document.title = `${p.title} — changelog · Proto Stand`;
}

function closeDialog() {
  if (dialog.open) dialog.close();
  document.title = 'Proto Stand · B2B Loans';
  trigger?.focus();
  trigger = null;
}

/** Open or close the dialog to match the URL. */
function sync() {
  const slug = slugFromHash();
  const p = slug ? prototypes.find((x) => x.slug === slug) : undefined;
  if (p) openDialog(p);
  else closeDialog();
}

function requestClose() {
  if ((history.state as { changelog?: boolean } | null)?.changelog) history.back();
  else {
    history.replaceState(null, '', `${location.pathname}${location.search}`);
    sync();
  }
}

list.addEventListener('click', (e) => {
  const button = (e.target as HTMLElement).closest<HTMLElement>('[data-changelog]');
  if (!button) return;
  trigger = button;
  history.pushState({ changelog: true }, '', `#changelog=${button.dataset.changelog}`);
  sync();
});
dialog.addEventListener('cancel', (e) => {
  e.preventDefault();
  requestClose();
});
dialog.querySelector('[data-close]')?.addEventListener('click', requestClose);
window.addEventListener('popstate', sync);

loadRegistry()
  .then((registry) => {
    prototypes = visiblePrototypes(registry.prototypes);
    list.innerHTML = prototypes.map(card).join('') || '<p class="hub-card-meta">Прототипов пока нет.</p>';
    sync();
  })
  .catch((err: Error) => {
    list.innerHTML = `<p class="hub-card-meta">Не удалось загрузить реестр: ${esc(err.message)}</p>`;
  });
