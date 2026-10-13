// <proto-shell>: version switcher panel. Isolated in Shadow DOM, carries its own copy of the tokens
// (the prototype may override or lack them), runs no animation loops, and only reacts to user input.
import type { Registry, RegistryPrototype, RegistryVersion } from '@proto/registry';
import tokensCss from '@proto/tokens/tokens.css?inline';
import shellCss from './shell.css?inline';
import { currentContext, targetUrl } from './switch.ts';

const HIDDEN_KEY = 'proto-shell:hidden';
const STATUS_LABEL: Record<string, string> = { draft: 'черновик', review: 'на ревью', frozen: 'заморожена' };

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );

const sessionGet = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const sessionSet = (key: string, value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // storage may be blocked; hiding then lasts until reload
  }
};

class ProtoShell extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });
  #proto: RegistryPrototype | null = null;
  #version: RegistryVersion | null = null;

  connectedCallback() {
    this.hidden = sessionGet(HIDDEN_KEY) === '1';
    window.addEventListener('keydown', this.#onKey);
    void this.#load();
  }

  disconnectedCallback() {
    window.removeEventListener('keydown', this.#onKey);
  }

  #onKey = (e: KeyboardEvent) => {
    if (e.altKey && e.shiftKey && e.code === 'KeyH') {
      this.hidden = !this.hidden;
      sessionSet(HIDDEN_KEY, this.hidden ? '1' : null);
    } else if (e.key === 'Escape') {
      this.#toggle(false);
    }
  };

  async #load() {
    const ctx = currentContext(document, location);
    if (!ctx) return this.remove();
    let registry: Registry;
    try {
      const res = await fetch('/registry.json', { cache: 'no-cache', credentials: 'same-origin' });
      registry = (await res.json()) as Registry;
    } catch {
      return this.remove();
    }
    this.#proto = registry.prototypes.find((p) => p.slug === ctx.slug) ?? null;
    this.#version = this.#proto?.versions.find((v) => v.version === ctx.version) ?? null;
    if (!this.#proto || !this.#version) return this.remove();
    this.#render();
  }

  #toggle(open?: boolean) {
    const panel = this.#root.querySelector<HTMLElement>('.panel');
    const pill = this.#root.querySelector<HTMLButtonElement>('.pill');
    if (!panel || !pill) return;
    panel.hidden = !(open ?? panel.hidden);
    pill.setAttribute('aria-expanded', String(!panel.hidden));
  }

  #render() {
    const p = this.#proto!;
    const v = this.#version!;
    const options = [...p.versions]
      .reverse()
      .map(
        (x) =>
          `<option value="${esc(x.version)}"${x.version === v.version ? ' selected' : ''}>` +
          `${esc(x.version)}${x.title ? ` — ${esc(x.title)}` : ''} · ${STATUS_LABEL[x.status] ?? x.status} · ${esc(x.date)}` +
          `</option>`,
      )
      .join('');
    const source = v.designSource ?? p.designSource;
    const previous = p.versions[p.versions.findIndex((x) => x.version === v.version) - 1];
    this.#root.innerHTML = `
      <style>${tokensCss.replaceAll(':root', ':host')}${shellCss}</style>
      <div class="panel" role="dialog" aria-label="Версии прототипа" hidden>
        <h2>${esc(p.title)}</h2>
        <div class="muted">${esc(p.owner)}</div>
        <div class="row"><a href="/">← Все прототипы</a>${
          previous
            ? `<a href="/p/${esc(p.slug)}/compare/?a=${esc(previous.version)}&b=${esc(v.version)}">Сравнить с ${esc(previous.version)}</a>`
            : ''
        }</div>
        <label class="muted" for="v">Версия</label>
        <select id="v">${options}</select>
        <div class="row">
          <strong>${esc(v.version)}${v.title ? ` — ${esc(v.title)}` : ''}</strong>
          <span class="badge" data-status="${esc(v.status)}">${STATUS_LABEL[v.status] ?? esc(v.status)}</span>
        </div>
        <div class="muted">${esc(v.date)} · ${esc(v.author)}</div>
        ${v.changelog.length ? `<ul>${v.changelog.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
        ${
          source?.url
            ? `<div class="row"><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">Источник дизайна ↗</a></div>`
            : source
              ? `<div class="row muted">Источник: ${esc(source.note ?? source.kind)}</div>`
              : ''
        }
        <div class="hint">Alt+Shift+H — скрыть панель · ?shell=0 — показ без панели</div>
      </div>
      <button class="pill" type="button" aria-expanded="false" aria-label="Версии прототипа">
        ${esc(p.slug)} · ${esc(v.version)} ▾
      </button>`;
    this.#root.querySelector('.pill')?.addEventListener('click', () => this.#toggle());
    this.#root.querySelector('select')?.addEventListener('change', (e) => {
      const target = p.versions.find((x) => x.version === (e.target as HTMLSelectElement).value);
      if (target) location.assign(targetUrl(location, p.slug, v, target));
    });
  }
}

if (!customElements.get('proto-shell')) {
  customElements.define('proto-shell', ProtoShell);
  document.body.append(document.createElement('proto-shell'));
}
