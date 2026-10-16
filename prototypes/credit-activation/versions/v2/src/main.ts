// «Единая активация» v2: КН / ОК credit activation flow as an iOS-like PWA (variant from query params).
// Routes (hash): #/, #/options, #/review, #/sts, #/documents, #/upload, #/success — listed in version.json.
import '@proto/ui/ui.css';
import './style.css';
import { setupMotion } from '@proto/motion';
import { startNavigation } from './nav';

setupMotion();

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = `<div class="app"><div class="viewport"></div></div>`;
startNavigation(app.querySelector<HTMLElement>('.viewport')!);
