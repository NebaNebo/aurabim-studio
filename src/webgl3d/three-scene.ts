import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { projectStore } from '../core/state-store';
import { ProjectState } from '../core/types';
import { WallBuilder } from './wall-builder';
import { FloorBuilder } from './floor-builder';
import { FurnitureBuilder } from './furniture-builder';
import { StructureBuilder } from './structure-builder';
import { MaterialLibrary } from './materials';
import { disposeHierarchy } from './dispose-util';
import { isPointInsidePolygon } from '../math/polygon-area';

export class ThreeSceneManager {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private orbitCamera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  // Architectural entities root group
  private modelRoot: THREE.Group = new THREE.Group();

  // Lighting
  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;

  private state: ProjectState;
  private unsubscribe: () => void;
  private animFrameId: number | null = null;
  private needsRebuild: boolean = false;

  // Walkthrough FPS controls
  private isWalkthrough: boolean = false;
  private keysDown: Record<string, boolean> = {};
  private moveSpeed: number = 3.5; // m/s
  private lastTime: number = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.state = projectStore.getState();

    // 1. Scene setup: Clean bright architectural daylight matching Coohom
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf0f4f8);
    this.scene.fog = new THREE.FogExp2(0xf0f4f8, 0.012);

    // 2. Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // 3. Camera setup
    const rect = canvas.getBoundingClientRect();
    this.orbitCamera = new THREE.PerspectiveCamera(50, rect.width / (rect.height || 1), 0.1, 150);
    this.orbitCamera.position.set(4, 7, 11);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.orbitCamera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02; // Don't clip under ground
    this.controls.minDistance = 1;
    this.controls.maxDistance = 50;
    this.controls.target.set(3.5, 1.2, 2.7);

    // 5. Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xd0d8e2, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaf0, 2.0);
    this.sunLight.position.set(14, 22, 16);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.02;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 60;
    this.sunLight.shadow.camera.left = -15;
    this.sunLight.shadow.camera.right = 15;
    this.sunLight.shadow.camera.top = 15;
    this.sunLight.shadow.camera.bottom = -15;
    this.scene.add(this.sunLight);

    // 6. Ground Plane
    const groundGeom = new THREE.PlaneGeometry(120, 120);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.9,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeom, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.002;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // 7. Add Model Root
    this.scene.add(this.modelRoot);

    // 8. Event subscriptions - Guaranteed Real-Time 3D Sync on every state change
    this.unsubscribe = projectStore.subscribe(s => {
      this.state = s;
      this.needsRebuild = true;
    });

    this.setupEvents();
    this.resizeCanvas();
    this.rebuildScene();
    this.startRenderLoop();
  }

  public destroy() {
    this.unsubscribe();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    disposeHierarchy(this.modelRoot);
    this.renderer.dispose();
  }

  public resizeCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.orbitCamera.aspect = rect.width / rect.height;
    this.orbitCamera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height, false);
  }

  public fitToExtents() {
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    if (box.isEmpty()) return;

    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.y, size.z);
    const dist = maxDim * 1.6;

    this.controls.target.copy(center);
    this.orbitCamera.position.set(center.x + dist * 0.7, center.y + dist * 0.8, center.z + dist);
    this.controls.update();
  }

  public setTopView() {
    const box = new THREE.Box3().setFromObject(this.modelRoot);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const size = new THREE.Vector3();
    box.getSize(size);

    const maxDim = Math.max(size.x, size.z);
    this.controls.target.set(center.x, 0, center.z);
    this.orbitCamera.position.set(center.x, maxDim * 1.8, center.z + 0.001);
    this.controls.update();
  }

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private pointerDownPos: { x: number; y: number } = { x: 0, y: 0 };
  private isolatedRoomId: string | null = null;

  public getIsolatedRoomId(): string | null {
    return this.isolatedRoomId;
  }

  public setIsolatedRoom(roomId: string | null) {
    this.isolatedRoomId = roomId;
    this.rebuildScene();
    if (roomId && this.state.rooms[roomId]) {
      this.focusRoom(roomId);
    } else {
      this.fitToExtents();
    }
  }

  public rebuildScene() {
    // Clear existing meshes with explicit 3D memory disposal
    while (this.modelRoot.children.length > 0) {
      const obj = this.modelRoot.children[0];
      disposeHierarchy(obj);
      this.modelRoot.remove(obj);
    }

    const isolatedRoom = this.isolatedRoomId ? this.state.rooms[this.isolatedRoomId] : null;
    const roomNodeSet = isolatedRoom ? new Set(isolatedRoom.nodeIds) : null;

    // 1. Build Floors with selected room highlight
    for (const room of Object.values(this.state.rooms)) {
      if (isolatedRoom && room.id !== isolatedRoom.id) continue;
      const isSelected = room.id === this.isolatedRoomId || (this.state.selection.type === 'room' && this.state.selection.id === room.id);
      const floorMesh = FloorBuilder.buildFloorMesh(room, isSelected);
      this.modelRoot.add(floorMesh);
    }

    // 2. Build Walls & Openings (only room boundary walls if isolated)
    for (const wall of Object.values(this.state.walls)) {
      if (isolatedRoom && roomNodeSet) {
        if (!roomNodeSet.has(wall.startNodeId) || !roomNodeSet.has(wall.endNodeId)) {
          continue;
        }
      }
      const wallMesh = WallBuilder.buildWallMesh(wall, this.state.nodes);
      this.modelRoot.add(wallMesh);
    }

    // 3. Build Corner Junctions & Smooth Curved Fillets
    for (const node of Object.values(this.state.nodes)) {
      if (isolatedRoom && roomNodeSet && !roomNodeSet.has(node.id)) {
        continue;
      }
      const connected = Object.values(this.state.walls).filter(
        w => w.startNodeId === node.id || w.endNodeId === node.id
      );
      const cornerMesh = WallBuilder.buildCornerMesh(
        node, 
        connected, 
        this.state.settings.wallHeight, 
        this.state.settings.wallThickness
      );
      if (cornerMesh) this.modelRoot.add(cornerMesh);
    }

    // 4. Build Architectural Structures (Columns, Beams, Staircases, Flues, Sills)
    if (this.state.structures && !isolatedRoom) {
      for (const struct of Object.values(this.state.structures)) {
        const structMesh = StructureBuilder.buildStructureMesh(struct, this.state.settings.wallHeight);
        this.modelRoot.add(structMesh);
      }
    }

    // 5. Build Blueprint Underlay at Y = -0.001m Ground Plane if toggled (only if not isolated)
    const bp = this.state.blueprintUnderlay;
    if (bp && bp.visible3D && bp.imageUrl && !isolatedRoom) {
      const loader = new THREE.TextureLoader();
      const texture = loader.load(bp.imageUrl);
      const widthM = (bp.widthPx * bp.mmPerPixel) / 1000;
      const heightM = (bp.heightPx * bp.mmPerPixel) / 1000;
      const bpGeom = new THREE.PlaneGeometry(widthM, heightM);
      const bpMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: bp.opacity ?? 0.45,
        depthWrite: false
      });
      const bpMesh = new THREE.Mesh(bpGeom, bpMat);
      bpMesh.rotation.x = -Math.PI / 2;
      bpMesh.position.set(bp.x / 1000 + widthM / 2, -0.001, bp.y / 1000 + heightM / 2);
      this.modelRoot.add(bpMesh);
    }

    // 6. Build Furniture (if isolated, only furniture inside the room polygon)
    for (const furn of Object.values(this.state.furniture)) {
      if (isolatedRoom) {
        if (!isPointInsidePolygon({ x: furn.position.x, y: furn.position.y }, isolatedRoom.points)) {
          continue;
        }
      }
      const furnMesh = FurnitureBuilder.buildFurnitureMesh(furn);
      this.modelRoot.add(furnMesh);
    }

    // 7. If room is isolated in 3D, build the Level Bracket (e.g. "[ 3F") on the side (Image 1)
    if (isolatedRoom) {
      const bracket = this.buildLevelBracket(isolatedRoom, '3F');
      if (bracket) this.modelRoot.add(bracket);
    }
  }

  /**
   * Builds the BIM 3D Floor Level Bracket on the side of the isolated room matching Image 1
   */
  private buildLevelBracket(room: any, floorLabel: string = '3F'): THREE.Group {
    const group = new THREE.Group();
    group.name = 'room_level_bracket';

    let minX = Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const pt of room.points) {
      const mx = pt.x / 1000;
      const mz = pt.y / 1000;
      if (mx < minX) minX = mx;
      if (mz < minZ) minZ = mz;
      if (mz > maxZ) maxZ = mz;
    }

    const wallHeightM = (this.state.settings.wallHeight || 2800) / 1000;
    const midZ = (minZ + maxZ) / 2;
    const bracketX = minX - 0.45;
    const armLen = 0.22;

    // Bracket lines:
    //  ┌
    //  │
    //  └
    const positions = new Float32Array([
      // Top horizontal arm
      bracketX, wallHeightM, midZ,
      bracketX + armLen, wallHeightM, midZ,
      // Vertical bar
      bracketX, 0, midZ,
      bracketX, wallHeightM, midZ,
      // Bottom horizontal arm
      bracketX, 0, midZ,
      bracketX + armLen, 0, midZ
    ]);

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      linewidth: 2,
      depthTest: false
    });
    const lines = new THREE.LineSegments(geom, lineMat);
    lines.renderOrder = 999;
    group.add(lines);

    // Floor label sprite: "3F"
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 52px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(floorLabel, 64, 64);
    }
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      depthTest: false,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(bracketX - 0.25, wallHeightM / 2, midZ);
    sprite.scale.set(0.65, 0.65, 1);
    sprite.renderOrder = 1000;
    group.add(sprite);

    return group;
  }

  private setupEvents() {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e) => {
      // Guard: disable hotkeys when typing in any input, select, textarea, or contentEditable element
      const target = (e.target || document.activeElement) as HTMLElement | null;
      if (
        target &&
        (target instanceof HTMLInputElement ||
          target instanceof HTMLSelectElement ||
          target instanceof HTMLTextAreaElement ||
          target.isContentEditable)
      ) {
        return;
      }
      this.keysDown[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keysDown[e.code] = false;
    });

    // 3D View Interactive Hover & Click Raycasting
    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.orbitCamera);
      const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);
      const hit = hits.find(h => h.object.userData?.type);
      if (hit) {
        this.canvas.style.cursor = 'pointer';
      } else {
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
    });

    this.canvas.addEventListener('pointerup', (e) => {
      const dx = Math.abs(e.clientX - this.pointerDownPos.x);
      const dy = Math.abs(e.clientY - this.pointerDownPos.y);
      if (dx > 6 || dy > 6) return; // Orbit drag, do not trigger click select

      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.orbitCamera);
      const hits = this.raycaster.intersectObjects(this.modelRoot.children, true);

      // Prioritize smaller entities: opening -> furniture -> structure -> room -> wall
      const priorityOrder = ['opening', 'furniture', 'structure', 'room', 'wall', 'node'];
      let chosenHit: THREE.Intersection | null = null;

      for (const pType of priorityOrder) {
        const found = hits.find(h => h.object.userData?.type === pType);
        if (found) {
          chosenHit = found;
          break;
        }
      }

      if (chosenHit && chosenHit.object.userData) {
        const { type, id } = chosenHit.object.userData;
        if (type && id) {
          projectStore.setSelection(type, id);
          if (type === 'room') {
            this.setIsolatedRoom(id);
          }
          return;
        }
      }

      // Ground or background click clears selection and un-isolates room
      if (this.isolatedRoomId) {
        this.setIsolatedRoom(null);
      }
      if (this.state.selection.type !== 'none') {
        projectStore.setSelection('none', null);
      }
    });
  }

  public focusRoom(roomId: string) {
    const room = this.state.rooms[roomId];
    if (!room || room.points.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of room.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const cX = ((minX + maxX) / 2) / 1000;
    const cZ = ((minY + maxY) / 2) / 1000;
    const spanX = Math.max(2, (maxX - minX) / 1000);
    const spanZ = Math.max(2, (maxY - minY) / 1000);
    const maxDim = Math.max(spanX, spanZ);

    this.controls.target.set(cX, 0.6, cZ);
    this.orbitCamera.position.set(cX + maxDim * 0.9, maxDim * 1.3, cZ + maxDim * 1.6);
    this.controls.update();
  }

  private startRenderLoop() {
    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
      this.lastTime = timestamp;

      // Rebuild 3D geometry smoothly on the animation frame when state changes
      if (this.needsRebuild) {
        this.rebuildScene();
        this.needsRebuild = false;
      }

      if (this.state.viewMode === 'walkthrough') {
        this.updateWalkthroughMovement(dt);
      } else {
        this.controls.update();
      }

      this.renderer.render(this.scene, this.orbitCamera);
      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private updateWalkthroughMovement(dt: number) {
    const moveDist = this.moveSpeed * dt;
    const forward = new THREE.Vector3();
    this.orbitCamera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (this.keysDown['KeyW'] || this.keysDown['ArrowUp']) {
      this.orbitCamera.position.addScaledVector(forward, moveDist);
    }
    if (this.keysDown['KeyS'] || this.keysDown['ArrowDown']) {
      this.orbitCamera.position.addScaledVector(forward, -moveDist);
    }
    if (this.keysDown['KeyA'] || this.keysDown['ArrowLeft']) {
      this.orbitCamera.position.addScaledVector(right, -moveDist);
    }
    if (this.keysDown['KeyD'] || this.keysDown['ArrowRight']) {
      this.orbitCamera.position.addScaledVector(right, moveDist);
    }

    // Keep camera at eye height (1.65m)
    this.orbitCamera.position.y = 1.65;
  }

  public setSunlightIntensity(intensity: number) {
    if (this.sunLight) {
      this.sunLight.intensity = intensity;
    }
  }

  public setTimeOfDay(hour: number) {
    // Map hour 6..18 to sun trajectory
    const angle = ((hour - 6) / 12) * Math.PI;
    const x = Math.cos(angle) * 22;
    const y = Math.max(Math.sin(angle) * 25, 3);
    const z = 16;
    this.sunLight.position.set(x, y, z);
    if (this.hemiLight) {
      const isNight = hour < 6 || hour > 19;
      this.hemiLight.intensity = isNight ? 0.35 : 0.85;
    }
  }

  public captureScreenshot(): string {
    this.renderer.render(this.scene, this.orbitCamera);
    return this.canvas.toDataURL('image/png');
  }
}
