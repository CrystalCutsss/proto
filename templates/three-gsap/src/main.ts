import '@proto/ui/ui.css';
import './style.css';
import { reveal, setupMotion, gsap } from '@proto/motion';
import { createStage, perfMonitor } from '@proto/three-kit';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
} from 'three';

setupMotion();

const css = getComputedStyle(document.documentElement);
const token = (name: string) => css.getPropertyValue(`--ds-${name}`).trim();

let update: (() => void) | null = null;
const stage = createStage({
  container: document.querySelector<HTMLElement>('#stage')!,
  onFrame: (dt) => {
    mesh.rotation.y += dt * 0.4;
    update?.();
  },
});
stage.camera.position.set(0, 0, 4);
stage.scene.background = new Color(token('color-bg-subtle'));
stage.scene.add(new AmbientLight(0xffffff, 0.6));
const sun = new DirectionalLight(0xffffff, 2);
sun.position.set(3, 4, 5);
stage.scene.add(sun);

const mesh = new Mesh(
  new IcosahedronGeometry(1, 2),
  new MeshStandardMaterial({ color: new Color(token('color-action-primary')), flatShading: true }),
);
stage.scene.add(mesh);
stage.start();

gsap.from(mesh.scale, { x: 0, y: 0, z: 0, duration: 1.2, ease: 'ds-emphasized' });
reveal('.copy > *');
void perfMonitor(stage.renderer).then((fn) => (update = fn));
