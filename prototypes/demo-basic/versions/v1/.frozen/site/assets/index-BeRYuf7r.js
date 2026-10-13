(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e={draft:`var(--ds-color-status-draft)`,review:`var(--ds-color-status-review)`,frozen:`var(--ds-color-status-frozen)`,active:`var(--ds-color-action-primary)`,paused:`var(--ds-color-status-review)`,archived:`var(--ds-color-status-draft)`},t=`
  :host {
    display: inline-block;
    padding: 0 var(--ds-space-2);
    border-radius: var(--ds-radius-full);
    font-size: var(--ds-font-size-sm);
    line-height: var(--ds-font-line-height-normal);
    color: var(--ds-color-fg-inverse);
    background: var(--ds-badge-color, var(--ds-color-status-draft));
    white-space: nowrap;
  }
`,n=class extends HTMLElement{static observedAttributes=[`status`];constructor(){super();let e=this.attachShadow({mode:`open`});e.innerHTML=`<style>${t}</style><slot></slot>`}attributeChangedCallback(){let t=e[this.getAttribute(`status`)??``]??e.draft;this.style.setProperty(`--ds-badge-color`,t)}};function r(e=customElements){e.get(`ds-badge`)||e.define(`ds-badge`,n)}r();var i={"#/":()=>`
    <section class="screen ds-stack">
      <h1 class="ds-heading">Демо: базовый</h1>
      <p class="ds-muted">Стартовый экран версии v1.</p>
      <div class="ds-cluster"><a class="ds-button" href="#/details">Подробнее</a></div>
    </section>`,"#/details":()=>`
    <section class="screen ds-stack">
      <h1 class="ds-heading">Подробности</h1>
      <div class="ds-card">Карточка на токенах дизайн-системы. <ds-badge status="draft">черновик</ds-badge></div>
      <div class="ds-cluster"><a class="ds-button" data-variant="ghost" href="#/">Назад</a></div>
    </section>`},a=document.querySelector(`#app`),o=()=>{a.innerHTML=(i[location.hash]??i[`#/`])()};window.addEventListener(`hashchange`,o),o();