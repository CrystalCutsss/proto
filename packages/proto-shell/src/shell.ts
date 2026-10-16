// <proto-shell>: the scenario/version menu inside an installed web app (display-mode: standalone), where
// there is no viewer around the prototype (ADR-0020). Isolated in Shadow DOM with its own copy of the tokens
// (the prototype may override or lack them); runs no animation loops and only reacts to user input.
import type { RegistryPrototype, RegistryVersion } from '@proto/registry';
import tokensCss from 'virtual:shell-tokens';
import menuCss from './menu.css?inline';
import {
  collapsible,
  createMenu,
  hideShortcut,
  loadRegistryPrototype,
  menuSummary,
  pickScenario,
} from './menu.ts';
import shellCss from './shell.css?inline';
import { createVariants } from './variants.ts';
import { axisValues, currentContext, screenUrl, targetUrl } from './switch.ts';

class ProtoShell extends HTMLElement {
  #root = this.attachShadow({ mode: 'open' });

  connectedCallback() {
    void this.#load();
  }

  async #load() {
    const ctx = currentContext(document, location);
    if (!ctx) return this.remove();
    let proto: RegistryPrototype | null;
    try {
      proto = await loadRegistryPrototype(ctx.slug);
    } catch {
      return this.remove();
    }
    const version: RegistryVersion | undefined = proto?.versions.find((v) => v.version === ctx.version);
    if (!proto || !version) return this.remove();
    const p = proto;
    const params = new URLSearchParams(location.search);
    const scenario = pickScenario(version, params.get('s'));
    const axes = axisValues(version.axes, params);
    // Next pages keep the query (?proto-display=standalone in tests) and remember the scenario.
    const search = (s: string) => {
      const q = new URLSearchParams(location.search);
      q.set('s', s);
      return `?${q}`;
    };

    /** Another choice restarts the version at its start screen, keeping the other query parameters. */
    const onAxis = (id: string, value: string) => {
      const q = new URLSearchParams(location.search);
      q.set(id, value);
      location.assign(screenUrl(p.slug, version, null, `?${q}`));
    };

    const menu = createMenu({
      scenario(id) {
        const s = pickScenario(version, id);
        location.assign(screenUrl(p.slug, version, s.route, search(s.id)));
      },
      version(v) {
        const target = p.versions.find((x) => x.version === v);
        if (!target) return;
        const s = pickScenario(target, scenario.id);
        location.assign(
          targetUrl(
            { pathname: location.pathname, hash: location.hash, search: search(s.id) },
            p.slug,
            version,
            target,
          ),
        );
      },
      axis: onAxis,
    });
    // Phones have no menu: versions with axes get the floating variants button there (ADR-0023).
    const variants = createVariants(onAxis);
    const state = { proto: p, version, scenario, axes };
    menu.update(state);
    variants.update(state);
    this.#root.innerHTML = `<style>${tokensCss.replaceAll(':root', ':host')}${shellCss}${menuCss}</style>`;
    const theme = document.createElement('div');
    theme.dataset.dsTheme = 'night';
    hideShortcut(menu.element, [window]);
    theme.append(menu.element, collapsible(menu.element, menuSummary(state)), ...variants.elements);
    this.#root.append(theme);
  }
}

if (!customElements.get('proto-shell')) {
  customElements.define('proto-shell', ProtoShell);
  document.body.append(document.createElement('proto-shell'));
}
