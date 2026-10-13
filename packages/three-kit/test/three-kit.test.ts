import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { disposeObject } from '../src/index.ts';

describe('disposeObject', () => {
  it('disposes geometries, materials and textures in the tree', () => {
    const geometry = new BoxGeometry();
    const map = new Texture();
    const material = new MeshStandardMaterial({ map });
    const group = new Group().add(new Mesh(geometry, material));
    const spies = [vi.spyOn(geometry, 'dispose'), vi.spyOn(material, 'dispose'), vi.spyOn(map, 'dispose')];
    disposeObject(group);
    for (const spy of spies) expect(spy).toHaveBeenCalledOnce();
  });
});
