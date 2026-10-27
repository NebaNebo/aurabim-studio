import * as THREE from 'three';

/**
 * Procedural PBR Material and Texture Generator
 * Generates rich, photorealistic textures via Canvas 2D without external URL dependencies.
 */

// Texture Cache
const textureCache: Record<string, THREE.CanvasTexture> = {};

function createWoodParquetTexture(): THREE.CanvasTexture {
  if (textureCache['wood_parquet']) return textureCache['wood_parquet'];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Warm Oak base
  ctx.fillStyle = '#b58855';
  ctx.fillRect(0, 0, 1024, 1024);

  // Draw wood planks
  const plankH = 64;
  const plankW = 256;
  const colors = ['#a97c48', '#b88a56', '#ba8d59', '#a27542', '#be925f'];

  for (let y = 0; y < 1024; y += plankH) {
    const rowOffset = (y / plankH) % 2 === 0 ? 0 : plankW / 2;
    for (let x = -plankW; x < 1024 + plankW; x += plankW) {
      const plankX = x + rowOffset;
      const c = colors[Math.floor(Math.random() * colors.length)];
      ctx.fillStyle = c;
      ctx.fillRect(plankX, y, plankW - 2, plankH - 2);

      // Subtle wood grain lines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
      for (let g = 0; g < 6; g++) {
        const gy = y + Math.random() * plankH;
        ctx.fillRect(plankX, gy, plankW - 2, 1 + Math.random() * 2);
      }
    }
  }

  // Plank bevel groove lines
  ctx.strokeStyle = 'rgba(40, 25, 15, 0.4)';
  ctx.lineWidth = 2;
  for (let y = 0; y < 1024; y += plankH) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  textureCache['wood_parquet'] = tex;
  return tex;
}

function createMarbleTexture(): THREE.CanvasTexture {
  if (textureCache['marble']) return textureCache['marble'];

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Carrara white base
  ctx.fillStyle = '#f5f6f8';
  ctx.fillRect(0, 0, 1024, 1024);

  // Soft organic marble veins
  ctx.strokeStyle = 'rgba(160, 168, 180, 0.25)';
  ctx.lineWidth = 3;
  ctx.filter = 'blur(4px)';

  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    let x = Math.random() * 1024;
    let y = 0;
    ctx.moveTo(x, y);
    while (y < 1024) {
      x += (Math.random() - 0.5) * 80;
      y += Math.random() * 90 + 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  textureCache['marble'] = tex;
  return tex;
}

function createTileTexture(): THREE.CanvasTexture {
  if (textureCache['tile']) return textureCache['tile'];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#222831'; // Dark slate tile
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 128;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  textureCache['tile'] = tex;
  return tex;
}

function createDrywallTexture(): THREE.CanvasTexture {
  if (textureCache['drywall']) return textureCache['drywall'];

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f0ebe1'; // Warm white plaster
  ctx.fillRect(0, 0, 512, 512);

  // Subtle stipple noise
  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  textureCache['drywall'] = tex;
  return tex;
}

export class MaterialLibrary {
  public static wallExterior = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.85,
    metalness: 0.1
  });

  public static wallInterior = new THREE.MeshStandardMaterial({
    map: createDrywallTexture(),
    color: 0xf3efe6,
    roughness: 0.9,
    metalness: 0.05
  });

  public static floorParquet = new THREE.MeshStandardMaterial({
    map: createWoodParquetTexture(),
    roughness: 0.45,
    metalness: 0.1
  });

  public static floorMarble = new THREE.MeshStandardMaterial({
    map: createMarbleTexture(),
    roughness: 0.15,
    metalness: 0.2
  });

  public static floorTile = new THREE.MeshStandardMaterial({
    map: createTileTexture(),
    roughness: 0.35,
    metalness: 0.1
  });

  public static doorWood = new THREE.MeshStandardMaterial({
    color: 0x8b5a2b,
    roughness: 0.4,
    metalness: 0.15
  });

  public static brassMetal = new THREE.MeshStandardMaterial({
    color: 0xd4af37,
    roughness: 0.3,
    metalness: 0.85
  });

  public static windowFrame = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.4,
    metalness: 0.3
  });

  public static windowGlass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    transmission: 0.92,
    opacity: 1,
    transparent: true,
    roughness: 0.05,
    ior: 1.52,
    reflectivity: 0.5
  });

  public static ceiling = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.95
  });

  public static ground = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.95
  });

  public static marbleTile = MaterialLibrary.floorMarble;
  public static graniteTile = MaterialLibrary.floorTile;

  public static getFloorMaterial(name: string): THREE.Material {
    switch (name) {
      case 'marble': return MaterialLibrary.floorMarble;
      case 'tile':
      case 'ceramic_tile': return MaterialLibrary.floorTile;
      case 'oak_parquet':
      default:
        return MaterialLibrary.floorParquet;
    }
  }
}
