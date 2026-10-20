// «Единая активация» v3: heavy and light conditions of the credit activation as an iOS-like PWA (one scenario).
// Routes (hash): #/, #/heavy, #/review, #/documents, #/upload, #/light, #/success — listed in version.json.
import '@proto/ui/ui.css';
import './style.css';
import { setupMotion } from '@proto/motion';
import { startNavigation } from './nav';

setupMotion();

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<div class="app"><div class="viewport"></div></div>`;
startNavigation(app.querySelector<HTMLElement>('.viewport')!);
