import * as THREE from 'three';
import { FurnitureItem } from '../core/types';
import { MaterialLibrary } from './materials';

export class FurnitureBuilder {
  public static buildFurnitureMesh(item: FurnitureItem): THREE.Group {
    const group = new THREE.Group();
    group.name = `furniture_${item.id}`;

    // Convert position from mm to meters (X, Z floor plane, Y elevation)
    const posX = item.position.x / 1000;
    const posZ = item.position.y / 1000;
    const posY = item.position.z / 1000;

    group.position.set(posX, posY, posZ);
    group.rotation.y = (-item.rotation * Math.PI) / 180;

    const w = item.dimensions.width / 1000;
    const d = item.dimensions.depth / 1000;
    const h = item.dimensions.height / 1000;

    const customMat = new THREE.MeshStandardMaterial({
      color: item.colorTint || 0x4a6fa5,
      roughness: 0.7,
      metalness: 0.1
    });

    switch (item.modelType) {
      case 'sofa':
        group.add(this.createSofa(w, d, h, customMat));
        break;
      case 'armchair':
        group.add(this.createArmchair(w, d, h, customMat));
        break;
      case 'bed':
        group.add(this.createBed(w, d, h, customMat));
        break;
      case 'table':
        group.add(this.createTable(w, d, h, customMat));
        break;
      case 'storage':
        group.add(this.createTvConsole(w, d, h, customMat));
        break;
      case 'lamp':
        group.add(this.createArcLamp(w, d, h));
        break;
      case 'nightstand':
        group.add(this.createNightstand(w, d, h));
        break;
      case 'wardrobe':
        group.add(this.createWardrobe(w, d, h, customMat));
        break;
      case 'dining_set':
        group.add(this.createDiningSet(w, d, h, customMat));
        break;
      case 'kitchen_island':
        group.add(this.createKitchenIsland(w, d, h));
        break;
      case 'desk':
        group.add(this.createDesk(w, d, h, customMat));
        break;
      case 'bookshelf':
        group.add(this.createBookshelf(w, d, h, customMat));
        break;
      case 'vanity':
        group.add(this.createVanity(w, d, h));
        break;
      case 'bathtub':
        group.add(this.createBathtub(w, d, h));
        break;
      case 'plant':
        group.add(this.createPlant(w, d, h));
        break;
      case 'rug':
        group.add(this.createRug(w, d, h, customMat));
        break;
      default: {
        const geom = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geom, customMat);
        mesh.position.y = h / 2;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
        break;
      }
    }

    group.userData = { type: 'furniture', id: item.id };
    group.traverse(child => {
      child.userData = { type: 'furniture', id: item.id };
    });

    return group;
  }

  private static createSofa(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const seatH = h * 0.45;
    const armW = w * 0.12;
    const backD = d * 0.22;

    const baseGeom = new THREE.BoxGeometry(w - armW * 2, seatH, d - backD);
    const baseMesh = new THREE.Mesh(baseGeom, mat);
    baseMesh.position.set(0, seatH / 2, backD / 2);
    baseMesh.castShadow = true;
    g.add(baseMesh);

    const backGeom = new THREE.BoxGeometry(w, h - seatH * 0.2, backD);
    const backMesh = new THREE.Mesh(backGeom, mat);
    backMesh.position.set(0, (h + seatH * 0.2) / 2, -d / 2 + backD / 2);
    backMesh.castShadow = true;
    g.add(backMesh);

    const armGeom = new THREE.BoxGeometry(armW, h * 0.7, d);
    const leftArm = new THREE.Mesh(armGeom, mat);
    leftArm.position.set(-w / 2 + armW / 2, (h * 0.7) / 2, 0);
    leftArm.castShadow = true;
    const rightArm = new THREE.Mesh(armGeom, mat);
    rightArm.position.set(w / 2 - armW / 2, (h * 0.7) / 2, 0);
    rightArm.castShadow = true;
    g.add(leftArm, rightArm);

    const legGeom = new THREE.CylinderGeometry(0.02, 0.015, seatH * 0.35);
    const legMat = MaterialLibrary.brassMetal;
    const legPositions = [
      [-w / 2 + armW, -d / 2 + 0.08],
      [w / 2 - armW, -d / 2 + 0.08],
      [-w / 2 + armW, d / 2 - 0.08],
      [w / 2 - armW, d / 2 - 0.08]
    ];
    for (const [lx, lz] of legPositions) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(lx, (seatH * 0.35) / 2, lz);
      g.add(leg);
    }
    return g;
  }

  private static createArmchair(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const seatH = h * 0.45;
    const seatGeom = new THREE.BoxGeometry(w * 0.75, seatH, d * 0.7);
    const seat = new THREE.Mesh(seatGeom, mat);
    seat.position.set(0, seatH / 2, 0.05);
    seat.castShadow = true;

    const backGeom = new THREE.BoxGeometry(w, h * 0.65, d * 0.2);
    const back = new THREE.Mesh(backGeom, mat);
    back.position.set(0, (h + seatH) / 2, -d / 2 + 0.1);
    back.castShadow = true;

    g.add(seat, back);
    return g;
  }

  private static createBed(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const headH = h;
    const headD = 0.12;
    const baseH = 0.35;
    const mattH = 0.25;

    const headGeom = new THREE.BoxGeometry(w, headH, headD);
    const headMesh = new THREE.Mesh(headGeom, mat);
    headMesh.position.set(0, headH / 2, -d / 2 + headD / 2);
    headMesh.castShadow = true;

    const frameGeom = new THREE.BoxGeometry(w, baseH, d - headD);
    const frameMesh = new THREE.Mesh(frameGeom, MaterialLibrary.doorWood);
    frameMesh.position.set(0, baseH / 2, headD / 2);
    frameMesh.castShadow = true;

    const mattMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const mattGeom = new THREE.BoxGeometry(w - 0.08, mattH, d - headD - 0.08);
    const mattMesh = new THREE.Mesh(mattGeom, mattMat);
    mattMesh.position.set(0, baseH + mattH / 2, headD / 2);
    mattMesh.castShadow = true;

    const pillowGeom = new THREE.BoxGeometry(w * 0.38, 0.12, 0.4);
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.8 });
    const p1 = new THREE.Mesh(pillowGeom, pillowMat);
    p1.position.set(-w * 0.23, baseH + mattH + 0.06, -d / 2 + headD + 0.25);
    const p2 = new THREE.Mesh(pillowGeom, pillowMat);
    p2.position.set(w * 0.23, baseH + mattH + 0.06, -d / 2 + headD + 0.25);

    g.add(headMesh, frameMesh, mattMesh, p1, p2);
    return g;
  }

  private static createTable(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const topThick = 0.04;
    const topGeom = new THREE.CylinderGeometry(w / 2, w / 2, topThick, 32);
    const topMesh = new THREE.Mesh(topGeom, mat);
    topMesh.position.set(0, h - topThick / 2, 0);
    topMesh.castShadow = true;

    const legGeom = new THREE.CylinderGeometry(0.02, 0.015, h - topThick);
    const legMat = MaterialLibrary.doorWood;
    const r = w * 0.35;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(Math.cos(angle) * r, (h - topThick) / 2, Math.sin(angle) * r);
      leg.castShadow = true;
      g.add(leg);
    }

    g.add(topMesh);
    return g;
  }

  private static createTvConsole(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const consoleH = 0.5;

    const cabGeom = new THREE.BoxGeometry(w, consoleH, d);
    const cabMesh = new THREE.Mesh(cabGeom, mat);
    cabMesh.position.set(0, consoleH / 2, 0);
    cabMesh.castShadow = true;

    const tvW = w * 0.75;
    const tvH = tvW * 0.56;
    const tvGeom = new THREE.BoxGeometry(tvW, tvH, 0.03);
    const tvMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.1, metalness: 0.8 });
    const tvMesh = new THREE.Mesh(tvGeom, tvMat);
    tvMesh.position.set(0, consoleH + 0.08 + tvH / 2, 0);
    tvMesh.castShadow = true;

    g.add(cabMesh, tvMesh);
    return g;
  }

  private static createDiningSet(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const topThick = 0.04;

    // Tabletop
    const topGeom = new THREE.BoxGeometry(w, topThick, d);
    const top = new THREE.Mesh(topGeom, mat);
    top.position.set(0, h - topThick / 2, 0);
    top.castShadow = true;
    g.add(top);

    // 4 Table legs
    const legGeom = new THREE.BoxGeometry(0.06, h - topThick, 0.06);
    const legMat = MaterialLibrary.doorWood;
    const offsets = [
      [-w / 2 + 0.08, -d / 2 + 0.08],
      [w / 2 - 0.08, -d / 2 + 0.08],
      [-w / 2 + 0.08, d / 2 - 0.08],
      [w / 2 - 0.08, d / 2 - 0.08]
    ];
    for (const [lx, lz] of offsets) {
      const leg = new THREE.Mesh(legGeom, legMat);
      leg.position.set(lx, (h - topThick) / 2, lz);
      leg.castShadow = true;
      g.add(leg);
    }

    // 4 Chairs around table
    const chairW = 0.45;
    const chairH = 0.85;
    const chairSeatH = 0.45;
    const chairGeom = new THREE.BoxGeometry(chairW, 0.04, chairW);
    const chairBackGeom = new THREE.BoxGeometry(chairW, chairH - chairSeatH, 0.03);

    const chairOffsets = [
      { x: -w * 0.25, z: d / 2 + 0.28, rot: 0 },
      { x: w * 0.25, z: d / 2 + 0.28, rot: 0 },
      { x: -w * 0.25, z: -d / 2 - 0.28, rot: Math.PI },
      { x: w * 0.25, z: -d / 2 - 0.28, rot: Math.PI }
    ];

    for (const co of chairOffsets) {
      const cg = new THREE.Group();
      cg.position.set(co.x, 0, co.z);
      cg.rotation.y = co.rot;

      const seat = new THREE.Mesh(chairGeom, mat);
      seat.position.y = chairSeatH;
      const back = new THREE.Mesh(chairBackGeom, mat);
      back.position.set(0, chairSeatH + (chairH - chairSeatH) / 2, chairW / 2);

      cg.add(seat, back);
      g.add(cg);
    }

    return g;
  }

  private static createKitchenIsland(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const baseGeom = new THREE.BoxGeometry(w, h * 0.94, d * 0.85);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(0, (h * 0.94) / 2, -d * 0.075);
    base.castShadow = true;

    // Waterfall quartz marble countertop
    const topGeom = new THREE.BoxGeometry(w + 0.05, 0.06, d);
    const top = new THREE.Mesh(topGeom, MaterialLibrary.floorMarble);
    top.position.set(0, h - 0.03, 0);
    top.castShadow = true;

    g.add(base, top);
    return g;
  }

  private static createDesk(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat);
    top.position.set(0, h - 0.02, 0);
    top.castShadow = true;

    // Metal legs
    const legMat = MaterialLibrary.brassMetal;
    const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d), legMat);
    l1.position.set(-w / 2 + 0.04, h / 2, 0);
    const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, h, d), legMat);
    l2.position.set(w / 2 - 0.04, h / 2, 0);

    // Laptop on desk
    const lapGeom = new THREE.BoxGeometry(0.3, 0.015, 0.22);
    const lapMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8, roughness: 0.2 });
    const laptop = new THREE.Mesh(lapGeom, lapMat);
    laptop.position.set(0, h + 0.01, 0);

    g.add(top, l1, l2, laptop);
    return g;
  }

  private static createBookshelf(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    frame.position.set(0, h / 2, 0);
    frame.castShadow = true;
    g.add(frame);
    return g;
  }

  private static createNightstand(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), MaterialLibrary.doorWood);
    body.position.set(0, h / 2, 0);
    body.castShadow = true;

    // Mini bedside lamp
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.25), MaterialLibrary.brassMetal);
    lamp.position.set(0, h + 0.125, 0);

    g.add(body, lamp);
    return g;
  }

  private static createWardrobe(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.set(0, h / 2, 0);
    body.castShadow = true;
    g.add(body);
    return g;
  }

  private static createVanity(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const cab = new THREE.Mesh(new THREE.BoxGeometry(w, h * 0.7, d), MaterialLibrary.floorMarble);
    cab.position.set(0, h * 0.35, 0);
    cab.castShadow = true;

    // Ceramic basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.18, 0.12, 24), new THREE.MeshStandardMaterial({ color: 0xffffff }));
    basin.position.set(0, h * 0.7 + 0.06, 0);

    // Chrome faucet
    const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.18), MaterialLibrary.brassMetal);
    faucet.position.set(0, h * 0.7 + 0.12, -d * 0.3);

    g.add(cab, basin, faucet);
    return g;
  }

  private static createBathtub(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const tubMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.1, metalness: 0.1 });
    const tubGeom = new THREE.CylinderGeometry(d / 2, d / 2 * 0.85, h, 32);
    tubGeom.scale(w / d, 1, 1);
    const tub = new THREE.Mesh(tubGeom, tubMat);
    tub.position.set(0, h / 2, 0);
    tub.castShadow = true;
    g.add(tub);
    return g;
  }

  private static createArcLamp(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.04), MaterialLibrary.brassMetal);
    base.position.y = 0.02;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, h * 0.9), MaterialLibrary.brassMetal);
    pole.position.set(0, h * 0.45, 0);

    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.22, 16), MaterialLibrary.brassMetal);
    shade.position.set(0, h, 0);
    shade.rotation.x = Math.PI;

    // Warm ambient point light inside lamp
    const light = new THREE.PointLight(0xffeedd, 1.2, 6);
    light.position.set(0, h - 0.1, 0);

    g.add(base, pole, shade, light);
    return g;
  }

  private static createPlant(w: number, d: number, h: number): THREE.Group {
    const g = new THREE.Group();
    const potH = h * 0.4;
    const potR = w * 0.35;

    const potMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.3 });
    const potGeom = new THREE.CylinderGeometry(potR, potR * 0.8, potH, 24);
    const potMesh = new THREE.Mesh(potGeom, potMat);
    potMesh.position.y = potH / 2;
    potMesh.castShadow = true;
    g.add(potMesh);

    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2d6a4f, roughness: 0.6 });
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const leafGeom = new THREE.SphereGeometry(w * 0.28, 8, 8);
      leafGeom.scale(1, 0.3, 1.4);
      const leaf = new THREE.Mesh(leafGeom, leafMat);
      leaf.position.set(Math.cos(angle) * (w * 0.2), potH + 0.15 + i * 0.04, Math.sin(angle) * (w * 0.2));
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.3;
      leaf.castShadow = true;
      g.add(leaf);
    }
    return g;
  }

  private static createRug(w: number, d: number, h: number, mat: THREE.Material): THREE.Group {
    const g = new THREE.Group();
    const rugGeom = new THREE.BoxGeometry(w, 0.008, d);
    const rug = new THREE.Mesh(rugGeom, mat);
    rug.position.set(0, 0.006, 0); // Directly above floor
    rug.receiveShadow = true;
    g.add(rug);
    return g;
  }
}
