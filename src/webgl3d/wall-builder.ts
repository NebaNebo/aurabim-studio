import * as THREE from 'three';
import { Wall, Point2D, Opening } from '../core/types';
import { MaterialLibrary } from './materials';

export class WallBuilder {
  /**
   * Generates a 3D Group representing an extruded wall with opening cutouts, frames, and niches.
   */
  public static buildWallMesh(
    wall: Wall,
    nodes: Record<string, Point2D>
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `wall_${wall.id}`;
    group.userData = { type: 'wall', id: wall.id };

    const pStartMm = nodes[wall.startNodeId];
    const pEndMm = nodes[wall.endNodeId];
    if (!pStartMm || !pEndMm) return group;

    // Convert from mm to meters
    const p1 = new THREE.Vector2(pStartMm.x / 1000, pStartMm.y / 1000);
    const p2 = new THREE.Vector2(pEndMm.x / 1000, pEndMm.y / 1000);

    const length = p1.distanceTo(p2);
    if (length < 0.01) return group;

    const thickness = (wall.thickness || 240) / 1000;
    const height = (wall.height || 2800) / 1000;

    // Arc Wall Tessellation
    if (wall.isCurved && wall.arcSagitta && Math.abs(wall.arcSagitta) > 1) {
      return this.buildCurvedWallMesh(wall, p1, p2, thickness, height);
    }

    // Position and orientation in 3D world (X-Z plane is floor, Y is vertical)
    const midPoint = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    group.position.set(midPoint.x, 0, midPoint.y);
    group.rotation.y = -angle; // Rotate around vertical axis

    // Sort openings along length
    const getOffset = (o: Opening) => (o.offset ?? o.offsetFromStart ?? 0);
    const openings = [...wall.openings].sort((a, b) => getOffset(a) - getOffset(b));

    if (openings.length === 0) {
      // Solid continuous wall (or low curb if external area boundary)
      const wallGeom = new THREE.BoxGeometry(length, height, thickness);
      const wallMat = wall.isExternalAreaBoundary ? MaterialLibrary.graniteTile : MaterialLibrary.wallInterior;
      const wallMesh = new THREE.Mesh(wallGeom, wallMat);
      wallMesh.position.set(0, height / 2, 0);
      wallMesh.castShadow = true;
      wallMesh.receiveShadow = true;
      wallMesh.userData = { type: 'wall', id: wall.id };
      group.add(wallMesh);
      return group;
    }

    // Wall with parametric openings: procedural segmented extrusion
    let cursor = -length / 2;

    for (let i = 0; i < openings.length; i++) {
      const op = openings[i];
      const opWidth = op.width / 1000;
      const opHeight = op.height / 1000;
      const sillHeight = op.sillHeight / 1000;
      const swingSide = op.swingSide ?? 1;
      const openAngleDeg = op.openAngleDeg !== undefined ? op.openAngleDeg : 35;

      // Position relative to wall center
      const opOffset = (getOffset(op) / 1000) - (length / 2);
      const opStart = opOffset - opWidth / 2;
      const opEnd = opOffset + opWidth / 2;

      // 1. Solid wall segment before opening
      const segmentLen = opStart - cursor;
      if (segmentLen > 0.02) {
        const segGeom = new THREE.BoxGeometry(segmentLen, height, thickness);
        const segMesh = new THREE.Mesh(segGeom, MaterialLibrary.wallInterior);
        segMesh.position.set(cursor + segmentLen / 2, height / 2, 0);
        segMesh.castShadow = true;
        segMesh.receiveShadow = true;
        segMesh.userData = { type: 'wall', id: wall.id };
        group.add(segMesh);
      }

      // 2. Bottom Sill block (under window or niche)
      if (sillHeight > 0.02) {
        const sillGeom = new THREE.BoxGeometry(opWidth, sillHeight, thickness);
        const sillMesh = new THREE.Mesh(sillGeom, MaterialLibrary.wallInterior);
        sillMesh.position.set(opOffset, sillHeight / 2, 0);
        sillMesh.castShadow = true;
        sillMesh.receiveShadow = true;
        sillMesh.userData = { type: 'wall', id: wall.id };
        group.add(sillMesh);
      }

      // 3. Top Lintel block (above opening up to ceiling)
      const lintelY = sillHeight + opHeight;
      const lintelHeight = height - lintelY;
      if (lintelHeight > 0.02) {
        const lintelGeom = new THREE.BoxGeometry(opWidth, lintelHeight, thickness);
        const lintelMesh = new THREE.Mesh(lintelGeom, MaterialLibrary.wallInterior);
        lintelMesh.position.set(opOffset, lintelY + lintelHeight / 2, 0);
        lintelMesh.castShadow = true;
        lintelMesh.receiveShadow = true;
        lintelMesh.userData = { type: 'wall', id: wall.id };
        group.add(lintelMesh);
      }

      // 4. Instantiation of Specific 3D Elements
      if (op.type === 'door' || op.type === 'double_door' || op.type === 'sliding_door' || op.type === 'unequal_double_door') {
        const isHingeLeft = op.hingeSide === 'left' || op.swingDirection === 'left';
        const isDouble = (op.type === 'double_door' || op.type === 'unequal_double_door');
        const isSliding = op.type === 'sliding_door';
        const doorGroup = this.buildDoor3D(opWidth, opHeight, thickness, isHingeLeft, swingSide, isDouble, isSliding, openAngleDeg);
        doorGroup.position.set(opOffset, 0, 0);
        doorGroup.userData = { type: 'opening', id: op.id };
        group.add(doorGroup);

      } else if (op.type === 'bay_window' || op.type === 'trapezoid_bay' || op.type === 'corner_bay') {
        const bayGroup = this.buildBayWindow3D(opWidth, opHeight, thickness, (op.depth || 600) / 1000, swingSide);
        bayGroup.position.set(opOffset, sillHeight, 0);
        bayGroup.userData = { type: 'opening', id: op.id };
        group.add(bayGroup);

      } else if (op.type === 'niche') {
        // Niche: Partial-depth CSG recess, leaves back wall solid!
        const nicheDepth = Math.min((op.depth || 150) / 1000, thickness - 0.04);
        const backWallThick = thickness - nicheDepth;

        const backWallGeom = new THREE.BoxGeometry(opWidth, opHeight, backWallThick);
        const backWallMesh = new THREE.Mesh(backWallGeom, MaterialLibrary.wallInterior);
        const backWallZ = -swingSide * (thickness / 2 - backWallThick / 2);
        backWallMesh.position.set(opOffset, sillHeight + opHeight / 2, backWallZ);
        backWallMesh.castShadow = true;
        backWallMesh.receiveShadow = true;
        backWallMesh.userData = { type: 'opening', id: op.id };
        group.add(backWallMesh);

        // Drywall shelf frame inside niche
        const shelfGroup = this.buildNicheTrim3D(opWidth, opHeight, nicheDepth, swingSide);
        shelfGroup.position.set(opOffset, sillHeight, 0);
        shelfGroup.userData = { type: 'opening', id: op.id };
        group.add(shelfGroup);

      } else if (op.type === 'opening' || op.type === 'arched_opening') {
        // Cased Opening with clean white drywall trim
        const trimGroup = this.buildOpeningTrim3D(opWidth, opHeight, thickness);
        trimGroup.position.set(opOffset, sillHeight, 0);
        trimGroup.userData = { type: 'opening', id: op.id };
        group.add(trimGroup);

      } else {
        // Window (Casement, Sliding, Floor-to-Ceiling)
        const windowGroup = this.buildWindow3D(opWidth, opHeight, thickness);
        windowGroup.position.set(opOffset, sillHeight, 0);
        windowGroup.userData = { type: 'opening', id: op.id };
        group.add(windowGroup);
      }

      cursor = opEnd;
    }

    // Final solid wall segment after last opening
    const endSegmentLen = (length / 2) - cursor;
    if (endSegmentLen > 0.02) {
      const segGeom = new THREE.BoxGeometry(endSegmentLen, height, thickness);
      const segMesh = new THREE.Mesh(segGeom, MaterialLibrary.wallInterior);
      segMesh.position.set(cursor + endSegmentLen / 2, height / 2, 0);
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      segMesh.userData = { type: 'wall', id: wall.id };
      group.add(segMesh);
    }

    return group;
  }

  /**
   * Builds curved wall with mathematically verified minor-arc sweep, preventing any 360-degree looping.
   */
  private static buildCurvedWallMesh(
    wall: Wall,
    p1: THREE.Vector2,
    p2: THREE.Vector2,
    thickness: number,
    height: number
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = `curved_wall_${wall.id}`;
    group.userData = { type: 'wall', id: wall.id };

    const segments = 32;
    const sagittaM = (wall.arcSagitta || 0) / 1000;
    const chordLen = p1.distanceTo(p2);
    if (chordLen < 0.01) return group;

    const h = Math.abs(sagittaM) < 0.001 ? (sagittaM >= 0 ? 0.001 : -0.001) : sagittaM;
    const radiusM = Math.abs(h / 2 + (chordLen * chordLen) / (8 * h));

    const chordMid = new THREE.Vector2().addVectors(p1, p2).multiplyScalar(0.5);
    const chordDir = new THREE.Vector2().subVectors(p2, p1).normalize();
    // Perpendicular normal to chord vector
    const chordNorm = new THREE.Vector2(-chordDir.y, chordDir.x);
    const distToCenter = radiusM - Math.abs(h);
    const dirSign = h >= 0 ? 1 : -1;
    const center = new THREE.Vector2().subVectors(chordMid, chordNorm.clone().multiplyScalar(distToCenter * dirSign));

    const startAngle = Math.atan2(p1.y - center.y, p1.x - center.x);
    
    // Minor arc central angle
    const theta = 2 * Math.asin(Math.min(1.0, chordLen / (2 * radiusM)));
    const targetMid = new THREE.Vector2().addVectors(chordMid, chordNorm.clone().multiplyScalar(h));

    const midPos = new THREE.Vector2(center.x + Math.cos(startAngle + theta / 2) * radiusM, center.y + Math.sin(startAngle + theta / 2) * radiusM);
    const midNeg = new THREE.Vector2(center.x + Math.cos(startAngle - theta / 2) * radiusM, center.y + Math.sin(startAngle - theta / 2) * radiusM);
    const sweep = (midPos.distanceTo(targetMid) < midNeg.distanceTo(targetMid)) ? theta : -theta;

    const angleStep = sweep / segments;
    for (let i = 0; i < segments; i++) {
      const aA = startAngle + i * angleStep;
      const aB = startAngle + (i + 1) * angleStep;

      const pA = new THREE.Vector2(center.x + Math.cos(aA) * radiusM, center.y + Math.sin(aA) * radiusM);
      const pB = new THREE.Vector2(center.x + Math.cos(aB) * radiusM, center.y + Math.sin(aB) * radiusM);
      const segLen = pA.distanceTo(pB);
      const segMid = new THREE.Vector2().addVectors(pA, pB).multiplyScalar(0.5);
      const segAngle = Math.atan2(pB.y - pA.y, pB.x - pA.x);

      const segGeom = new THREE.BoxGeometry(segLen * 1.02, height, thickness);
      const segMesh = new THREE.Mesh(segGeom, MaterialLibrary.wallInterior);
      segMesh.position.set(segMid.x, height / 2, segMid.y);
      segMesh.rotation.y = -segAngle;
      segMesh.castShadow = true;
      segMesh.receiveShadow = true;
      segMesh.userData = { type: 'wall', id: wall.id };
      group.add(segMesh);
    }

    return group;
  }

  /**
   * Builds single or double door in 3D with proper flush hinge alignment, handles, and adjustable open angle.
   */
  private static buildDoor3D(
    width: number, 
    height: number, 
    wallThickness: number, 
    openLeft: boolean,
    swingSide: 1 | -1 = 1,
    isDouble: boolean = false,
    isSliding: boolean = false,
    openAngleDeg: number = 35
  ): THREE.Group {
    const doorGroup = new THREE.Group();
    const frameThick = 0.05;
    const frameDepth = wallThickness + 0.02;
    const openAngleRad = (openAngleDeg * Math.PI) / 180;

    // Door Jambs
    const jambGeom = new THREE.BoxGeometry(frameThick, height, frameDepth);
    const leftJamb = new THREE.Mesh(jambGeom, MaterialLibrary.doorWood);
    leftJamb.position.set(-width / 2 + frameThick / 2, height / 2, 0);
    const rightJamb = new THREE.Mesh(jambGeom, MaterialLibrary.doorWood);
    rightJamb.position.set(width / 2 - frameThick / 2, height / 2, 0);
    doorGroup.add(leftJamb, rightJamb);

    // Door Head
    const headGeom = new THREE.BoxGeometry(width, frameThick, frameDepth);
    const headMesh = new THREE.Mesh(headGeom, MaterialLibrary.doorWood);
    headMesh.position.set(0, height - frameThick / 2, 0);
    doorGroup.add(headMesh);

    const panelH = height - frameThick;
    const panelThick = 0.04;
    const hingeZ = swingSide * (wallThickness / 2 - panelThick / 2);

    if (isDouble) {
      // Symmetrical Double Doors meeting in the center (Images 2 & 4 fix)
      const halfW = (width - frameThick * 2) / 2;
      const leafGeom = new THREE.BoxGeometry(halfW, panelH, panelThick);

      // Left Door Leaf
      const pivotLeft = new THREE.Group();
      pivotLeft.position.set(-width / 2 + frameThick, 0, hingeZ);
      const panelLeft = new THREE.Mesh(leafGeom, MaterialLibrary.doorWood);
      panelLeft.position.set(halfW / 2, panelH / 2, 0);
      panelLeft.castShadow = true;
      pivotLeft.add(panelLeft);

      // Left Handle (near center meeting point)
      const handleL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), MaterialLibrary.brassMetal);
      handleL.rotation.z = Math.PI / 2;
      handleL.position.set(halfW - 0.06, 1.0, 0.035 * swingSide);
      pivotLeft.add(handleL);

      pivotLeft.rotation.y = openAngleRad * swingSide;
      doorGroup.add(pivotLeft);

      // Right Door Leaf
      const pivotRight = new THREE.Group();
      pivotRight.position.set(width / 2 - frameThick, 0, hingeZ);
      const panelRight = new THREE.Mesh(leafGeom, MaterialLibrary.doorWood);
      panelRight.position.set(-halfW / 2, panelH / 2, 0);
      panelRight.castShadow = true;
      pivotRight.add(panelRight);

      // Right Handle
      const handleR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.12), MaterialLibrary.brassMetal);
      handleR.rotation.z = Math.PI / 2;
      handleR.position.set(-halfW + 0.06, 1.0, 0.035 * swingSide);
      pivotRight.add(handleR);

      pivotRight.rotation.y = -openAngleRad * swingSide;
      doorGroup.add(pivotRight);

    } else if (isSliding) {
      // Sliding Door: Overlapping bypass panels
      const halfW = (width - frameThick * 2) / 2 + 0.03;
      const leafGeom = new THREE.BoxGeometry(halfW, panelH, panelThick);
      const slideDist = (openAngleDeg / 90) * (halfW * 0.85);

      const panel1 = new THREE.Mesh(leafGeom, MaterialLibrary.doorWood);
      panel1.position.set(-halfW / 2 + 0.015, panelH / 2, -panelThick / 2);
      panel1.castShadow = true;

      const panel2 = new THREE.Mesh(leafGeom, MaterialLibrary.doorWood);
      panel2.position.set(halfW / 2 - 0.015 - slideDist, panelH / 2, panelThick / 2);
      panel2.castShadow = true;

      doorGroup.add(panel1, panel2);

    } else {
      // Single Door
      const panelW = width - frameThick * 2;
      const panelGeom = new THREE.BoxGeometry(panelW, panelH, panelThick);

      const doorPivot = new THREE.Group();
      const hingeX = openLeft ? (-width / 2 + frameThick) : (width / 2 - frameThick);
      doorPivot.position.set(hingeX, 0, hingeZ);

      const panelMesh = new THREE.Mesh(panelGeom, MaterialLibrary.doorWood);
      panelMesh.position.set(openLeft ? panelW / 2 : -panelW / 2, panelH / 2, 0);
      panelMesh.castShadow = true;
      doorPivot.add(panelMesh);

      // Handle Lever
      const handleGeom = new THREE.CylinderGeometry(0.012, 0.012, 0.12);
      const handleMesh = new THREE.Mesh(handleGeom, MaterialLibrary.brassMetal);
      handleMesh.rotation.z = Math.PI / 2;
      handleMesh.position.set(openLeft ? panelW - 0.08 : -panelW + 0.08, 1.0, 0.035 * swingSide);
      doorPivot.add(handleMesh);

      // Hinge rotation flush from jamb rebate
      doorPivot.rotation.y = (openLeft ? 1 : -1) * openAngleRad * swingSide;
      doorGroup.add(doorPivot);
    }

    return doorGroup;
  }

  private static buildWindow3D(width: number, height: number, wallThickness: number): THREE.Group {
    const winGroup = new THREE.Group();
    const frameThick = 0.05;
    const frameDepth = wallThickness * 0.7;

    const vertGeom = new THREE.BoxGeometry(frameThick, height, frameDepth);
    const leftFrame = new THREE.Mesh(vertGeom, MaterialLibrary.windowFrame);
    leftFrame.position.set(-width / 2 + frameThick / 2, height / 2, 0);

    const rightFrame = new THREE.Mesh(vertGeom, MaterialLibrary.windowFrame);
    rightFrame.position.set(width / 2 - frameThick / 2, height / 2, 0);

    const horizGeom = new THREE.BoxGeometry(width, frameThick, frameDepth);
    const bottomFrame = new THREE.Mesh(horizGeom, MaterialLibrary.windowFrame);
    bottomFrame.position.set(0, frameThick / 2, 0);

    const topFrame = new THREE.Mesh(horizGeom, MaterialLibrary.windowFrame);
    topFrame.position.set(0, height - frameThick / 2, 0);

    const mullion = new THREE.Mesh(vertGeom, MaterialLibrary.windowFrame);
    mullion.position.set(0, height / 2, 0);

    winGroup.add(leftFrame, rightFrame, bottomFrame, topFrame, mullion);

    // Glass Panes
    const glassW = (width - frameThick * 3) / 2;
    const glassH = height - frameThick * 2;
    const glassGeom = new THREE.BoxGeometry(glassW, glassH, 0.012);

    const leftGlass = new THREE.Mesh(glassGeom, MaterialLibrary.windowGlass);
    leftGlass.position.set(-width / 4 + frameThick / 4, height / 2, 0);

    const rightGlass = new THREE.Mesh(glassGeom, MaterialLibrary.windowGlass);
    rightGlass.position.set(width / 4 - frameThick / 4, height / 2, 0);

    winGroup.add(leftGlass, rightGlass);
    return winGroup;
  }

  private static buildBayWindow3D(
    width: number, 
    height: number, 
    wallThickness: number, 
    depth: number, 
    swingSide: 1 | -1
  ): THREE.Group {
    const bayGroup = new THREE.Group();
    const zOffset = swingSide * (wallThickness / 2 + depth / 2);

    // Bottom Sill Slab
    const sillGeom = new THREE.BoxGeometry(width, 0.06, depth);
    const sillMesh = new THREE.Mesh(sillGeom, MaterialLibrary.marbleTile);
    sillMesh.position.set(0, 0.03, zOffset);
    sillMesh.castShadow = true;
    bayGroup.add(sillMesh);

    // Top Soffit Roof Slab
    const soffitGeom = new THREE.BoxGeometry(width, 0.06, depth);
    const soffitMesh = new THREE.Mesh(soffitGeom, MaterialLibrary.wallInterior);
    soffitMesh.position.set(0, height - 0.03, zOffset);
    bayGroup.add(soffitMesh);

    // Front Window Pane
    const frontGeom = new THREE.BoxGeometry(width - 0.04, height - 0.08, 0.012);
    const frontGlass = new THREE.Mesh(frontGeom, MaterialLibrary.windowGlass);
    frontGlass.position.set(0, height / 2, swingSide * (wallThickness / 2 + depth));
    bayGroup.add(frontGlass);

    // Left & Right Side Glazing
    const sideGeom = new THREE.BoxGeometry(0.012, height - 0.08, depth - 0.04);
    const leftGlass = new THREE.Mesh(sideGeom, MaterialLibrary.windowGlass);
    leftGlass.position.set(-width / 2 + 0.02, height / 2, zOffset);
    const rightGlass = new THREE.Mesh(sideGeom, MaterialLibrary.windowGlass);
    rightGlass.position.set(width / 2 - 0.02, height / 2, zOffset);
    bayGroup.add(leftGlass, rightGlass);

    return bayGroup;
  }

  private static buildNicheTrim3D(width: number, height: number, depth: number, swingSide: 1 | -1): THREE.Group {
    const group = new THREE.Group();
    const frameThick = 0.03;
    const shelfGeom = new THREE.BoxGeometry(width, frameThick, depth);
    const shelfMesh = new THREE.Mesh(shelfGeom, MaterialLibrary.doorWood);
    shelfMesh.position.set(0, frameThick / 2, swingSide * (depth / 2));
    group.add(shelfMesh);
    return group;
  }

  private static buildOpeningTrim3D(width: number, height: number, wallThickness: number): THREE.Group {
    const group = new THREE.Group();
    const trimThick = 0.025;
    const trimDepth = wallThickness + 0.02;

    const jambGeom = new THREE.BoxGeometry(trimThick, height, trimDepth);
    const leftJamb = new THREE.Mesh(jambGeom, MaterialLibrary.wallInterior);
    leftJamb.position.set(-width / 2 + trimThick / 2, height / 2, 0);
    const rightJamb = new THREE.Mesh(jambGeom, MaterialLibrary.wallInterior);
    rightJamb.position.set(width / 2 - trimThick / 2, height / 2, 0);

    const headGeom = new THREE.BoxGeometry(width, trimThick, trimDepth);
    const headMesh = new THREE.Mesh(headGeom, MaterialLibrary.wallInterior);
    headMesh.position.set(0, height - trimThick / 2, 0);

    group.add(leftJamb, rightJamb, headMesh);
    return group;
  }

  /**
   * Builds clean corner join post or smooth curved fillet cylinder bridging intersecting walls at a corner vertex.
   */
  public static buildCornerMesh(
    node: Point2D,
    connectedWalls: Wall[],
    wallHeight: number = 2800,
    wallThickness: number = 240
  ): THREE.Group | null {
    if (connectedWalls.length < 2) return null;

    const group = new THREE.Group();
    group.name = `corner_${node.id}`;
    group.userData = { type: 'node', id: node.id };

    const posM = new THREE.Vector2(node.x / 1000, node.y / 1000);
    const heightM = wallHeight / 1000;
    const thickM = wallThickness / 1000;

    if (node.cornerStyle === 'fillet' && (node.filletRadiusMm || 0) > 0) {
      // Smooth curved cylinder corner fillet
      const radiusM = (node.filletRadiusMm || 400) / 1000;
      const filletGeom = new THREE.CylinderGeometry(radiusM, radiusM, heightM, 32);
      const filletMesh = new THREE.Mesh(filletGeom, MaterialLibrary.wallInterior);
      filletMesh.position.set(posM.x, heightM / 2, posM.y);
      filletMesh.castShadow = true;
      filletMesh.receiveShadow = true;
      filletMesh.userData = { type: 'node', id: node.id };
      group.add(filletMesh);
    } else {
      // Solid corner junction cylinder to seal intersecting wall miters without gaps
      const junctionGeom = new THREE.CylinderGeometry(thickM / 2, thickM / 2, heightM, 16);
      const junctionMesh = new THREE.Mesh(junctionGeom, MaterialLibrary.wallInterior);
      junctionMesh.position.set(posM.x, heightM / 2, posM.y);
      junctionMesh.castShadow = true;
      junctionMesh.receiveShadow = true;
      junctionMesh.userData = { type: 'wall' };
      group.add(junctionMesh);
    }

    return group;
  }
}
