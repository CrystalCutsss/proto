// «Единая активация»: five-screen credit activation flow as an iOS-like PWA (375 × 812).
// Routes (hash): #/, #/conditions, #/review, #/documents, #/success — listed in version.json.
import '@proto/ui/ui.css';
import './style.css';
import { setupMotion } from '@proto/motion';
import { startNavigation } from './nav';

setupMotion();

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<div class="device"><div class="viewport"></div></div>`;
startNavigation(app.querySelector<HTMLElement>('.viewport')!);
