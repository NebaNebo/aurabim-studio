import * as THREE from 'three';
import earcut from 'earcut';
import { RoomPolygon } from '../core/types';
import { MaterialLibrary } from './materials';

export class FloorBuilder {
  /**
   * Triangulates a room polygon using earcut and generates a 3D floor slab mesh.
   */
  public static buildFloorMesh(room: RoomPolygon, isSelected: boolean = false): THREE.Group {
    const group = new THREE.Group();
    group.name = `floor_${room.id}`;
    group.userData = { type: 'room', id: room.id };

    if (room.points.length < 3) return group;

    // Convert polygon coordinates from mm to meters
    // In Three.js: X is horizontal, Z is depth, Y is vertical elevation
    const flatCoords: number[] = [];
    for (const p of room.points) {
      flatCoords.push(p.x / 1000, p.y / 1000);
    }

    // Triangulate 2D polygon with earcut
    const indices = earcut(flatCoords, [], 2);
    if (indices.length === 0) return group;

    const vertices: number[] = [];
    const uvs: number[] = [];
    const normals: number[] = [];

    for (let i = 0; i < flatCoords.length; i += 2) {
      const x = flatCoords[i];
      const z = flatCoords[i + 1];
      vertices.push(x, 0.005, z); // 5mm above ground to prevent z-fighting
      normals.push(0, 1, 0);      // Upward normal

      // UV coordinates (scaled: 1 repeat per 1.5 meters)
      uvs.push(x / 1.5, z / 1.5);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    let floorMat = MaterialLibrary.getFloorMaterial(room.floorMaterial);
    if (isSelected) {
      // Subtle cyan tint when room is selected
      const selMat = (floorMat as THREE.MeshStandardMaterial).clone();
      selMat.emissive = new THREE.Color(0x003344);
      selMat.emissiveIntensity = 0.4;
      floorMat = selMat;
    }

    const floorMesh = new THREE.Mesh(geometry, floorMat);
    floorMesh.receiveShadow = true;
    floorMesh.userData = { type: 'room', id: room.id };
    group.add(floorMesh);

    // If room is selected, render glowing cyan perimeter line (Matching Image 1)
    if (isSelected) {
      const outlinePoints: THREE.Vector3[] = [];
      for (const p of room.points) {
        outlinePoints.push(new THREE.Vector3(p.x / 1000, 0.015, p.y / 1000));
      }
      outlinePoints.push(new THREE.Vector3(room.points[0].x / 1000, 0.015, room.points[0].y / 1000));

      const outlineGeom = new THREE.BufferGeometry().setFromPoints(outlinePoints);
      const outlineMat = new THREE.LineBasicMaterial({
        color: 0x00f0ff,
        linewidth: 3,
        depthTest: false
      });
      const outlineLine = new THREE.Line(outlineGeom, outlineMat);
      outlineLine.renderOrder = 999;
      group.add(outlineLine);
    }

    // Build baseboard / skirting trim along walls
    const skirting = this.buildSkirtingBoard(room.points);
    if (skirting) group.add(skirting);

    return group;
  }

  private static buildSkirtingBoard(points: { x: number; y: number }[]): THREE.Mesh | null {
    if (points.length < 3) return null;

    const skirtH = 0.09; // 90mm skirting board
    const skirtT = 0.015; // 15mm thick

    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(skirtT, 0);
    shape.lineTo(skirtT, skirtH);
    shape.lineTo(0, skirtH);
    shape.closePath();

    // Extrude along perimeter path
    const pathPoints: THREE.Vector3[] = [];
    for (const p of points) {
      pathPoints.push(new THREE.Vector3(p.x / 1000, 0, p.y / 1000));
    }
    // Close path
    pathPoints.push(new THREE.Vector3(points[0].x / 1000, 0, points[0].y / 1000));

    const curve = new THREE.CatmullRomCurve3(pathPoints, true, 'catmullrom', 0);
    // Simple line skirting for performance:
    const geom = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff });
    const line = new THREE.Line(geom, lineMat);
    line.position.y = 0.01;
    return line as unknown as THREE.Mesh;
  }
}
