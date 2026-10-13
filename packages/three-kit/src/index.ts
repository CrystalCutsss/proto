// three.js boilerplate for prototypes. WebGLRenderer by default (ADR-0005); decoders are self-hosted.
import {
  Mesh,
  type Object3D,
  PerspectiveCamera,
  Scene,
  Texture,
  type WebGLRendererParameters,
  WebGLRenderer,
} from 'three';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface StageOptions extends WebGLRendererParameters {
  container: HTMLElement;
  /** Upper bound for devicePixelRatio (default 2) — the main lever for fill-rate cost. */
  maxPixelRatio?: number;
  fov?: number;
  /** Called every frame with delta and elapsed time in seconds. */
  onFrame?: (dt: number, t: number) => void;
}

export interface Stage {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  start(): void;
  stop(): void;
  dispose(): void;
}

/** Renderer + scene + camera with resize handling; the loop pauses while the tab is hidden. */
export function createStage({
  container,
  maxPixelRatio = 2,
  fov = 50,
  onFrame,
  ...params
}: StageOptions): Stage {
  const renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance', ...params });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
  container.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(fov, 1, 0.1, 1000);

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = container;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  let last = 0;
  let elapsed = 0;
  let running = false;
  const frame = (now: number) => {
    const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
    last = now;
    elapsed += dt;
    onFrame?.(dt, elapsed);
    renderer.render(scene, camera);
  };
  const start = () => {
    running = true;
    last = 0;
    renderer.setAnimationLoop(frame);
  };
  const stop = () => {
    running = false;
    renderer.setAnimationLoop(null);
  };
  const onVisibility = () => {
    if (document.hidden) renderer.setAnimationLoop(null);
    else if (running) start();
  };
  document.addEventListener('visibilitychange', onVisibility);

  return {
    renderer,
    scene,
    camera,
    start,
    stop,
    dispose() {
      stop();
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      disposeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

/**
 * GLTF loader wired to Draco, KTX2 (Basis) and Meshopt decoders served from the version itself.
 * `decoderBase` defaults to `${import.meta.env.BASE_URL}decoders/`, filled by the copyDecoders() Vite plugin.
 */
export function createGltfLoader(
  renderer: WebGLRenderer,
  decoderBase = `${import.meta.env.BASE_URL}decoders/`,
) {
  const draco = new DRACOLoader().setDecoderPath(`${decoderBase}draco/`);
  const ktx2 = new KTX2Loader().setTranscoderPath(`${decoderBase}basis/`).detectSupport(renderer);
  const loader = new GLTFLoader().setDRACOLoader(draco).setKTX2Loader(ktx2).setMeshoptDecoder(MeshoptDecoder);
  return {
    loader,
    dispose() {
      draco.dispose();
      ktx2.dispose();
    },
  };
}

/** Free GPU memory of an object tree: geometries, materials and their textures. */
export function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    if (!(obj instanceof Mesh)) return;
    obj.geometry?.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const material of materials) {
      if (!material) continue;
      for (const value of Object.values(material)) if (value instanceof Texture) value.dispose();
      material.dispose();
    }
  });
}

/** stats-gl overlay (FPS, CPU, GPU), enabled with ?perf=1. Returns an update function or null. */
export async function perfMonitor(renderer: WebGLRenderer, search = location.search) {
  if (new URLSearchParams(search).get('perf') !== '1') return null;
  const { default: Stats } = await import('stats-gl');
  const stats = new Stats({ trackGPU: true, horizontal: true });
  document.body.append(stats.dom);
  await stats.init(renderer);
  return () => stats.update();
}
