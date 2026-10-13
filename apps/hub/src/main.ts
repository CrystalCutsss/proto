import '@proto/ui/ui.css';
import './hub.css';
import type { RegistryPrototype } from '@proto/registry';
import { defineElements } from '@proto/ui';
import {
  allTags,
  esc,
  filterPrototypes,
  type Filters,
  loadRegistry,
  plural,
  STATUS_LABEL,
  type StatusFilter,
} from './data.ts';

defineElements();

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const grid = $('#grid');
const summary = $('#summary');
const search = $<HTMLInputElement>('#search');
const status = $<HTMLSelectElement>('#status');
const tagsBox = $('#tags');

const params = new URLSearchParams(location.search);
const filters: Filters = {
  query: params.get('q') ?? '',
  status: (params.get('status') as StatusFilter) ?? 'current',
  tags: params.getAll('tag'),
};
search.value = filters.query;
status.value = filters.status;

function card(p: RegistryPrototype) {
  const preview = p.preview
    ? `<img class="hub-preview" src="${esc(p.preview)}" alt="" loading="lazy" width="640" height="400" />`
    : `<div class="hub-preview hub-placeholder" aria-hidden="true">${esc(p.title.slice(0, 1).toUpperCase())}</div>`;
  const versions = [...p.versions]
    .reverse()
    .map(
      (v) => `<li>
        <a href="${esc(v.path)}">${esc(v.version)}${v.title ? ` — ${esc(v.title)}` : ''}</a>
        <ds-badge status="${esc(v.status)}">${STATUS_LABEL[v.status] ?? esc(v.status)}</ds-badge>
        <span class="ds-muted">${esc(v.date)}</span>
        ${v.changelog.length ? `<ul class="hub-changelog">${v.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
      </li>`,
    )
    .join('');
  return `<article class="ds-card hub-card">
    <a href="${esc(p.path)}" class="hub-preview-link" tabindex="-1">${preview}</a>
    <div class="ds-cluster hub-card-head">
      <h2 class="hub-title"><a href="${esc(p.path)}">${esc(p.title)}</a></h2>
      <ds-badge status="${esc(p.status)}">${STATUS_LABEL[p.status] ?? esc(p.status)}</ds-badge>
    </div>
    ${p.description ? `<p class="hub-description">${esc(p.description)}</p>` : ''}
    <div class="ds-muted">${esc(p.owner)} · обновлён ${esc(p.updated)} · ${plural(p.versions.length, ['версия', 'версии', 'версий'])}</div>
    ${p.tags.length ? `<div class="ds-cluster">${p.tags.map((t) => `<span class="hub-tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    <div class="ds-cluster">
      <a class="ds-button" href="${esc(p.path)}">Открыть ${esc(p.defaultVersion)}</a>
      ${p.versions.length > 1 ? `<a class="ds-button" data-variant="ghost" href="${esc(p.path)}compare/">Сравнить</a>` : ''}
    </div>
    <details><summary>Версии и changelog</summary><ul class="hub-versions">${versions}</ul></details>
  </article>`;
}

function syncUrl() {
  const q = new URLSearchParams();
  if (filters.query) q.set('q', filters.query);
  if (filters.status !== 'current') q.set('status', filters.status);
  for (const t of filters.tags) q.append('tag', t);
  history.replaceState(null, '', `${location.pathname}${q.size ? `?${q}` : ''}`);
}

let prototypes: RegistryPrototype[] = [];

function render() {
  const list = filterPrototypes(prototypes, filters);
  grid.innerHTML = list.map(card).join('') || '<p class="ds-muted">Ничего не найдено.</p>';
  summary.textContent = `${plural(list.length, ['прототип', 'прототипа', 'прототипов'])} из ${prototypes.length}`;
  tagsBox.innerHTML = allTags(prototypes)
    .map(
      (t) =>
        `<button type="button" class="ds-tag" data-tag="${esc(t)}" aria-pressed="${filters.tags.includes(t)}">#${esc(t)}</button>`,
    )
    .join('');
  syncUrl();
}

search.addEventListener('input', () => {
  filters.query = search.value;
  render();
});
status.addEventListener('change', () => {
  filters.status = status.value as StatusFilter;
  render();
});
tagsBox.addEventListener('click', (e) => {
  const tag = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]')?.dataset.tag;
  if (!tag) return;
  filters.tags = filters.tags.includes(tag) ? filters.tags.filter((t) => t !== tag) : [...filters.tags, tag];
  render();
});

loadRegistry()
  .then((registry) => {
    prototypes = registry.prototypes;
    render();
  })
  .catch((err: Error) => {
    grid.innerHTML = `<p class="ds-muted">Не удалось загрузить реестр: ${esc(err.message)}</p>`;
  });
