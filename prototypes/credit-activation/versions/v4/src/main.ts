// «Единая активация» v4: «Кредит» → «Условия» (wheel) / «Тарифы» (КН) → review, as an iOS-like PWA (КН / ОК axis).
// Routes (hash): #/, #/conditions, #/tariffs, #/review, #/documents, #/upload, #/success — listed in version.json.
import '@proto/ui/ui.css';
import './style.css';
import { setupMotion } from '@proto/motion';
import { startNavigation } from './nav';

setupMotion();

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<div class="app"><div class="viewport"></div></div>`;
startNavigation(app.querySelector<HTMLElement>('.viewport')!);
