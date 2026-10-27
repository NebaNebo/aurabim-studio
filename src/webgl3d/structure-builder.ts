import * as THREE from 'three';
import { StructureItem } from '../core/types';
import { MaterialLibrary } from './materials';

export class StructureBuilder {
  public static buildStructureMesh(struct: StructureItem, roomHeightMm: number = 2800): THREE.Group {
    const group = new THREE.Group();
    group.name = `struct_${struct.id}`;

    const posX = struct.position.x / 1000;
    const posZ = struct.position.y / 1000;
    const posY = (struct.position.z || 0) / 1000;

    const width = struct.dimensions.width / 1000;
    const length = struct.dimensions.length / 1000;
    const height = (struct.dimensions.height || roomHeightMm) / 1000;

    group.position.set(posX, posY, posZ);
    group.rotation.y = -(struct.rotation * Math.PI) / 180;

    switch (struct.type) {
      case 'column': {
        if (struct.subType === 'round') {
          const radius = Math.min(width, length) / 2;
          const cylGeom = new THREE.CylinderGeometry(radius, radius, height, 28);
          const cylMesh = new THREE.Mesh(cylGeom, MaterialLibrary.wallInterior);
          cylMesh.position.set(0, height / 2, 0);
          cylMesh.castShadow = true;
          cylMesh.receiveShadow = true;
          group.add(cylMesh);
        } else {
          const boxGeom = new THREE.BoxGeometry(width, height, length);
          const boxMesh = new THREE.Mesh(boxGeom, MaterialLibrary.wallInterior);
          boxMesh.position.set(0, height / 2, 0);
          boxMesh.castShadow = true;
          boxMesh.receiveShadow = true;
          group.add(boxMesh);
        }
        break;
      }

      case 'beam': {
        const beamH = struct.dimensions.height / 1000;
        const distFromTop = (struct.distanceFromTop || 0) / 1000;
        const roomH = roomHeightMm / 1000;
        const beamY = roomH - beamH / 2 - distFromTop;

        const beamGeom = new THREE.BoxGeometry(width, beamH, length);
        const beamMesh = new THREE.Mesh(beamGeom, MaterialLibrary.wallInterior);
        beamMesh.position.set(0, beamY, 0);
        beamMesh.castShadow = true;
        beamMesh.receiveShadow = true;
        group.add(beamMesh);
        break;
      }

      case 'staircase': {
        const risers = struct.riserCount || 16;
        const stepH = height / risers;
        const stepD = length / risers;

        // Stepped procedural treads and risers
        for (let i = 0; i < risers; i++) {
          const treadY = (i + 0.5) * stepH;
          const treadZ = -length / 2 + (i + 0.5) * stepD;

          const stepGeom = new THREE.BoxGeometry(width, stepH, stepD);
          const stepMesh = new THREE.Mesh(stepGeom, MaterialLibrary.doorWood);
          stepMesh.position.set(0, treadY, treadZ);
          stepMesh.castShadow = true;
          stepMesh.receiveShadow = true;
          group.add(stepMesh);
        }

        // Glass / Aluminum Side Balustrades
        const railGeom = new THREE.BoxGeometry(0.02, 0.9, length);
        const leftRail = new THREE.Mesh(railGeom, MaterialLibrary.windowGlass);
        leftRail.position.set(-width / 2 + 0.02, height / 2 + 0.45, 0);
        const rightRail = new THREE.Mesh(railGeom, MaterialLibrary.windowGlass);
        rightRail.position.set(width / 2 - 0.02, height / 2 + 0.45, 0);
        group.add(leftRail, rightRail);
        break;
      }

      case 'flue': {
        const flueGeom = new THREE.BoxGeometry(width, height, length);
        const flueMesh = new THREE.Mesh(flueGeom, MaterialLibrary.wallInterior);
        flueMesh.position.set(0, height / 2, 0);
        flueMesh.castShadow = true;
        flueMesh.receiveShadow = true;
        group.add(flueMesh);
        break;
      }

      case 'floor_opening': {
        // Floor Void Indicator Border in 3D
        const borderThick = 0.06;
        const borderGeom = new THREE.BoxGeometry(width, 0.08, borderThick);
        const b1 = new THREE.Mesh(borderGeom, MaterialLibrary.brassMetal);
        b1.position.set(0, 0.04, -length / 2);
        const b2 = new THREE.Mesh(borderGeom, MaterialLibrary.brassMetal);
        b2.position.set(0, 0.04, length / 2);

        const sideBorderGeom = new THREE.BoxGeometry(borderThick, 0.08, length);
        const s1 = new THREE.Mesh(sideBorderGeom, MaterialLibrary.brassMetal);
        s1.position.set(-width / 2, 0.04, 0);
        const s2 = new THREE.Mesh(sideBorderGeom, MaterialLibrary.brassMetal);
        s2.position.set(width / 2, 0.04, 0);

        group.add(b1, b2, s1, s2);
        break;
      }

      case 'bay_window_sill': {
        const sillGeom = new THREE.BoxGeometry(width, 0.04, length);
        const sillMesh = new THREE.Mesh(sillGeom, MaterialLibrary.marbleTile);
        sillMesh.position.set(0, 0.02, 0);
        sillMesh.castShadow = true;
        group.add(sillMesh);
        break;
      }
    }

    group.userData = { type: 'structure', id: struct.id };
    group.traverse(child => {
      child.userData = { type: 'structure', id: struct.id };
    });

    return group;
  }
}
