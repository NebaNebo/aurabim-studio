import * as THREE from 'three';

/**
 * Recursively disposes all geometries, materials, and textures
 * attached to a Three.js Object3D hierarchy to prevent WebGL memory leaks.
 */
export function disposeHierarchy(root: THREE.Object3D): void {
  root.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.Points) {
      if (child.geometry) {
        child.geometry.dispose();
      }

      if (child.material) {
        if (Array.isArray(child.material)) {
          for (const mat of child.material) {
            disposeMaterial(mat);
          }
        } else {
          disposeMaterial(child.material);
        }
      }
    }
  });
}

function disposeMaterial(mat: THREE.Material): void {
  // Dispose all potential texture maps on the material
  const matAny = mat as any;
  const textureSlots = [
    'map',
    'alphaMap',
    'aoMap',
    'bumpMap',
    'displacementMap',
    'emissiveMap',
    'envMap',
    'lightMap',
    'metalnessMap',
    'normalMap',
    'roughnessMap'
  ];

  for (const slot of textureSlots) {
    if (matAny[slot] && typeof matAny[slot].dispose === 'function') {
      matAny[slot].dispose();
    }
  }

  mat.dispose();
}
