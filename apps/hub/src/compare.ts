// /p/<slug>/compare/?a=v1&b=v2 — two versions side by side (iframes without the shell).
import '@proto/ui/ui.css';
import './hub.css';
import { esc, loadRegistry, STATUS_LABEL } from './data.ts';

const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;
const slug =
  /^\/p\/([a-z0-9-]+)\/compare\/?$/.exec(location.pathname)?.[1] ??
  new URLSearchParams(location.search).get('p');

const registry = await loadRegistry();
const proto = registry.prototypes.find((p) => p.slug === slug);
if (!proto) {
  $('#title').textContent = 'Прототип не найден';
} else {
  document.title = `Сравнение — ${proto.title}`;
  $('#title').textContent = proto.title;
  const params = new URLSearchParams(location.search);
  const ids = proto.versions.map((v) => v.version);
  const pick = (key: string, fallback: string) =>
    ids.includes(params.get(key) ?? '') ? params.get(key)! : fallback;
  const state = { a: pick('a', ids.at(-2) ?? ids[0]!), b: pick('b', ids.at(-1)!) };
  const options = proto.versions
    .map(
      (v) =>
        `<option value="${esc(v.version)}">${esc(v.version)}${v.title ? ` — ${esc(v.title)}` : ''} · ${STATUS_LABEL[v.status] ?? v.status}</option>`,
    )
    .join('');
  const apply = () => {
    for (const side of ['a', 'b'] as const) {
      const frame = $<HTMLIFrameElement>(`#frame-${side}`);
      const src = `/p/${proto.slug}/${state[side]}/?shell=0`;
      if (frame.getAttribute('src') !== src) frame.src = src;
    }
    history.replaceState(null, '', `?a=${state.a}&b=${state.b}`);
  };
  for (const side of ['a', 'b'] as const) {
    const select = $<HTMLSelectElement>(`#${side}`);
    select.innerHTML = options;
    select.value = state[side];
    select.addEventListener('change', () => {
      state[side] = select.value;
      apply();
    });
  }
  apply();
}
