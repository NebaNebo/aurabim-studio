import { projectStore } from '../core/state-store';
import { ThreeSceneManager } from '../webgl3d/three-scene';
import { CadViewport } from '../cad2d/cad-viewport';
import { showToast } from './toast-notifier';

export class PipController {
  private pipWindow: HTMLElement;
  private pipContainer: HTMLElement;
  private centerViewport: HTMLElement;

  private cadCanvas: HTMLCanvasElement;
  private threeCanvas: HTMLCanvasElement;

  private threeScene: ThreeSceneManager;
  private cadViewport: CadViewport;

  private isSplitScreen: boolean = false;
  private splitGutter: HTMLElement | null = null;
  private splitRatio: number = 50; // percentage: 15% to 85%
  private isDraggingSplit: boolean = false;

  private activePipTab: '3d' | 'rooms' | 'drawing' = 'rooms';
  private roomsOverlayEl: HTMLElement | null = null;

  private lastArrangedMode: string | null = null;
  private lastArrangedPip: boolean | null = null;

  constructor(
    pipWindow: HTMLElement,
    centerViewport: HTMLElement,
    threeScene: ThreeSceneManager,
    cadViewport: CadViewport
  ) {
    this.pipWindow = pipWindow;
    this.centerViewport = centerViewport;
    this.threeScene = threeScene;
    this.cadViewport = cadViewport;

    this.pipContainer = pipWindow.querySelector('#pip-canvas-slot')!;
    this.cadCanvas = document.getElementById('cad-canvas') as HTMLCanvasElement;
    this.threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;

    this.initSplitGutter();
    this.bindPipEvents();
    this.bindHudEvents();

    projectStore.subscribe(state => {
      this.updateViewportArrangement(state.viewMode, state.pipVisible);
      this.updateHudState(state.viewMode);
      if (this.activePipTab === 'rooms') {
        this.renderRoomsOverlay();
      }
    });

    // Render rooms overlay mini-map on startup
    this.renderRoomsOverlay();
    this.updateZoomDisplay();
  }

  private initSplitGutter() {
    let gutter = document.getElementById('split-gutter');
    if (!gutter) {
      gutter = document.createElement('div');
      gutter.id = 'split-gutter';
      gutter.className = 'split-gutter';
      gutter.innerHTML = `
        <div class="split-gutter-line"></div>
        <div class="split-gutter-pill" title="Drag to adjust split ratio">
          <span class="split-grip-icon">⠿</span>
        </div>
      `;
      this.centerViewport.appendChild(gutter);
    }
    this.splitGutter = gutter;

    this.splitGutter.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isDraggingSplit = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      this.splitGutter?.classList.add('active');
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDraggingSplit) return;
      const rect = this.centerViewport.getBoundingClientRect();
      const rawPct = ((e.clientX - rect.left) / rect.width) * 100;
      this.splitRatio = Math.max(15, Math.min(85, Math.round(rawPct * 10) / 10));
      this.applySplitDimensions();

      this.cadViewport.resizeCanvas();
      this.threeScene.resizeCanvas();
    });

    window.addEventListener('mouseup', () => {
      if (this.isDraggingSplit) {
        this.isDraggingSplit = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        this.splitGutter?.classList.remove('active');
        this.cadViewport.resizeCanvas();
        this.threeScene.resizeCanvas();
      }
    });
  }

  private applySplitDimensions() {
    if (!this.isSplitScreen) return;
    const pct = this.splitRatio;

    this.cadCanvas.style.position = 'absolute';
    this.cadCanvas.style.top = '0';
    this.cadCanvas.style.left = '0';
    this.cadCanvas.style.width = `${pct}%`;
    this.cadCanvas.style.height = '100%';

    if (this.splitGutter) {
      this.splitGutter.style.display = 'flex';
      this.splitGutter.style.left = `${pct}%`;
    }

    this.threeCanvas.style.position = 'absolute';
    this.threeCanvas.style.top = '0';
    this.threeCanvas.style.left = `${pct}%`;
    this.threeCanvas.style.width = `${100 - pct}%`;
    this.threeCanvas.style.height = '100%';
  }

  private clearCanvasInlineStyles() {
    this.cadCanvas.style.position = '';
    this.cadCanvas.style.top = '';
    this.cadCanvas.style.left = '';
    this.cadCanvas.style.width = '';
    this.cadCanvas.style.height = '';

    this.threeCanvas.style.position = '';
    this.threeCanvas.style.top = '';
    this.threeCanvas.style.left = '';
    this.threeCanvas.style.width = '';
    this.threeCanvas.style.height = '';

    if (this.splitGutter) {
      this.splitGutter.style.display = 'none';
    }
  }

  private bindPipEvents() {
    // Pointer Event Isolation: prevent all pointer events from reaching underlying canvas
    const stopPropagationEvents = ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'];
    for (const evt of stopPropagationEvents) {
      this.pipWindow.addEventListener(evt, (e) => {
        e.stopPropagation();
      });
    }

    // Draggable PiP Window via Grip
    const grip = this.pipWindow.querySelector('.pip-drag-grip') as HTMLElement | null;
    if (grip) {
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let initLeft = 0;
      let initTop = 0;

      grip.addEventListener('pointerdown', (e: PointerEvent) => {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        grip.setPointerCapture(e.pointerId);
        grip.style.cursor = 'grabbing';

        const rect = this.pipWindow.getBoundingClientRect();
        const parentRect = this.centerViewport.getBoundingClientRect();

        initLeft = rect.left - parentRect.left;
        initTop = rect.top - parentRect.top;
        startX = e.clientX;
        startY = e.clientY;

        this.pipWindow.style.right = 'auto';
        this.pipWindow.style.bottom = 'auto';
        this.pipWindow.style.left = `${initLeft}px`;
        this.pipWindow.style.top = `${initTop}px`;
      });

      grip.addEventListener('pointermove', (e: PointerEvent) => {
        if (!isDragging) return;
        e.preventDefault();
        e.stopPropagation();

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        const parentRect = this.centerViewport.getBoundingClientRect();
        const pipW = this.pipWindow.offsetWidth;
        const pipH = this.pipWindow.offsetHeight;

        const newLeft = Math.max(8, Math.min(parentRect.width - pipW - 8, initLeft + dx));
        const newTop = Math.max(8, Math.min(parentRect.height - pipH - 8, initTop + dy));

        this.pipWindow.style.left = `${newLeft}px`;
        this.pipWindow.style.top = `${newTop}px`;
      });

      const endDrag = (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        grip.style.cursor = 'grab';
        try {
          grip.releasePointerCapture(e.pointerId);
        } catch {
          // ignore
        }
      };

      grip.addEventListener('pointerup', endDrag);
      grip.addEventListener('pointercancel', endDrag);
    }

    // 1. Full 3D Preview (Toggle between 2d_main and 3d_main)
    this.pipWindow.querySelector('#btn-pip-fullscreen')?.addEventListener('click', () => {
      this.toggleFull3DPreview();
    });

    // 2. Swap button
    this.pipWindow.querySelector('#btn-pip-swap')?.addEventListener('click', () => {
      if (this.isSplitScreen) {
        this.disableSplitScreen();
      }
      projectStore.swapViews();
    });

    // 3. Toggle PiP visibility
    this.pipWindow.querySelector('#btn-pip-close')?.addEventListener('click', () => {
      projectStore.togglePip();
    });

    // 4. PiP Tabs (3D, Rooms, Drawing)
    const tabs = this.pipWindow.querySelectorAll('.pip-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        tabs.forEach(t => t.classList.remove('active'));
        const target = e.currentTarget as HTMLElement;
        target.classList.add('active');
        const tabType = target.getAttribute('data-tab') as '3d' | 'rooms' | 'drawing';
        this.switchPipTab(tabType);
      });
    });
  }

  private hoveredMinimapRoomId: string | null = null;
  private minimapTransform = { scale: 1, offsetX: 0, offsetY: 0 };

  private switchPipTab(tabType: '3d' | 'rooms' | 'drawing') {
    this.activePipTab = tabType;
    if (tabType === '3d') {
      if (this.roomsOverlayEl) {
        this.roomsOverlayEl.style.display = 'none';
      }
      this.threeScene.setIsolatedRoom(null);
      const state = projectStore.getState();
      this.updateViewportArrangement(state.viewMode, state.pipVisible, true);
      showToast('3D Real-Time Render Active');
    } else if (tabType === 'rooms') {
      const state = projectStore.getState();
      const rooms = Object.values(state.rooms);
      const targetRoomId = (state.selection.type === 'room' && state.selection.id)
        ? state.selection.id
        : (rooms[0]?.id || null);
      if (targetRoomId) {
        this.threeScene.setIsolatedRoom(targetRoomId);
        projectStore.setSelection('room', targetRoomId);
      }
      this.renderRoomsOverlay();
      showToast('Room Isolator & Floor Plan Mini-Map Active');
    } else if (tabType === 'drawing') {
      if (this.roomsOverlayEl) {
        this.roomsOverlayEl.style.display = 'none';
      }
      this.cadViewport.centerView();
      showToast('Blueprint Extents Centered');
    }
  }

  private renderRoomsOverlay() {
    if (!this.roomsOverlayEl) {
      this.roomsOverlayEl = document.createElement('div');
      this.roomsOverlayEl.className = 'pip-rooms-overlay';
      this.pipContainer.appendChild(this.roomsOverlayEl);
    }

    this.roomsOverlayEl.style.display = 'flex';
    this.roomsOverlayEl.innerHTML = `
      <div style="flex: 1; display: flex; flex-direction: column; background: var(--bg-surface); position: relative; height: 100%;">
        <canvas id="pip-minimap-canvas" style="flex: 1; width: 100%; height: 100%; display: block;"></canvas>
        <div style="padding: 8px 12px 10px 12px; display: flex; justify-content: center; align-items: center; background: var(--bg-surface); border-top: 1px solid var(--border-hairline);">
          <button class="pip-display-all-btn" id="btn-pip-display-all">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
            <span>Display All Rooms</span>
          </button>
        </div>
        <div style="position: absolute; bottom: 3px; left: 5px; font-size: 11px; color: var(--border-subtle); user-select: none; pointer-events: none;">╲</div>
      </div>
    `;

    const canvas = this.roomsOverlayEl.querySelector('#pip-minimap-canvas') as HTMLCanvasElement;
    if (canvas) {
      this.drawRoomsMinimap(canvas);

      canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseScr = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const mouseMm = {
          x: (mouseScr.x - this.minimapTransform.offsetX) / this.minimapTransform.scale,
          y: (mouseScr.y - this.minimapTransform.offsetY) / this.minimapTransform.scale
        };

        const state = projectStore.getState();
        const hitRoom = Object.values(state.rooms).find(r => this.isPointInPoly(mouseMm, r.points));
        const hitId = hitRoom ? hitRoom.id : null;

        if (this.hoveredMinimapRoomId !== hitId) {
          this.hoveredMinimapRoomId = hitId;
          canvas.style.cursor = hitId ? 'pointer' : 'default';
          this.drawRoomsMinimap(canvas);
        }
      });

      canvas.addEventListener('mouseleave', () => {
        if (this.hoveredMinimapRoomId) {
          this.hoveredMinimapRoomId = null;
          canvas.style.cursor = 'default';
          this.drawRoomsMinimap(canvas);
        }
      });

      canvas.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseScr = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const mouseMm = {
          x: (mouseScr.x - this.minimapTransform.offsetX) / this.minimapTransform.scale,
          y: (mouseScr.y - this.minimapTransform.offsetY) / this.minimapTransform.scale
        };

        const state = projectStore.getState();
        const hitRoom = Object.values(state.rooms).find(r => this.isPointInPoly(mouseMm, r.points));
        if (hitRoom) {
          projectStore.setSelection('room', hitRoom.id);
          this.threeScene.setIsolatedRoom(hitRoom.id);
          this.drawRoomsMinimap(canvas);
          showToast(`Isolated ${hitRoom.name} in 3D`);
        } else {
          projectStore.setSelection('none', null);
          this.threeScene.setIsolatedRoom(null);
          this.drawRoomsMinimap(canvas);
        }
      });
    }

    this.roomsOverlayEl.querySelector('#btn-pip-display-all')?.addEventListener('click', () => {
      this.threeScene.setIsolatedRoom(null);
      projectStore.setSelection('none', null);
      if (canvas) this.drawRoomsMinimap(canvas);
      showToast('Displaying all rooms');
    });
  }

  private drawRoomsMinimap(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const state = projectStore.getState();
    const rooms = Object.values(state.rooms);
    if (rooms.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No enclosed rooms detected', rect.width / 2, rect.height / 2);
      return;
    }

    // Compute bounding box
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const r of rooms) {
      for (const p of r.points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const pad = 24;
    const modelW = Math.max(100, maxX - minX);
    const modelH = Math.max(100, maxY - minY);
    const availW = rect.width - pad * 2;
    const availH = rect.height - pad * 2;
    const scale = Math.min(availW / modelW, availH / modelH);

    const offsetX = pad + (availW - modelW * scale) / 2 - minX * scale;
    const offsetY = pad + (availH - modelH * scale) / 2 - minY * scale;
    this.minimapTransform = { scale, offsetX, offsetY };

    const toScr = (pt: { x: number; y: number }) => ({
      x: pt.x * scale + offsetX,
      y: pt.y * scale + offsetY
    });

    const activeRoomId = this.threeScene.getIsolatedRoomId() || (state.selection.type === 'room' ? state.selection.id : null);

    // 1. Draw unselected rooms (soft neutral gray matching Image 1)
    for (const r of rooms) {
      if (r.id === activeRoomId) continue;
      const isHovered = r.id === this.hoveredMinimapRoomId;

      ctx.beginPath();
      const p0 = toScr(r.points[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < r.points.length; i++) {
        const p = toScr(r.points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      ctx.fillStyle = isHovered ? '#e2e8f0' : '#e5e7eb';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 2. Draw active/isolated room with vivid blue outline and soft sky-blue fill (matching Image 1)
    const activeRoom = rooms.find(r => r.id === activeRoomId);
    if (activeRoom) {
      ctx.beginPath();
      const p0 = toScr(activeRoom.points[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < activeRoom.points.length; i++) {
        const p = toScr(activeRoom.points[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.closePath();

      ctx.fillStyle = '#dbeafe'; // Soft blue fill
      ctx.fill();
      ctx.strokeStyle = '#3b82f6'; // Bright blue border
      ctx.lineWidth = 2.2;
      ctx.stroke();
    }

    // 3. Draw dark floating tooltip on hovered room (matching Image 2)
    if (this.hoveredMinimapRoomId) {
      const hRoom = rooms.find(r => r.id === this.hoveredMinimapRoomId);
      if (hRoom) {
        let sumX = 0, sumY = 0;
        for (const p of hRoom.points) { sumX += p.x; sumY += p.y; }
        const cScr = toScr({ x: sumX / hRoom.points.length, y: sumY / hRoom.points.length });

        ctx.save();
        ctx.font = '600 11px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const label = hRoom.name || 'Unnamed';
        const textMetrics = ctx.measureText(label);
        const tipW = Math.max(56, textMetrics.width + 16);
        const tipH = 26;

        // Dark tooltip box matching Image 2
        ctx.fillStyle = '#262626';
        ctx.beginPath();
        ctx.roundRect(cScr.x - tipW / 2, cScr.y - tipH / 2, tipW, tipH, 4);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, cScr.x, cScr.y);
        ctx.restore();
      }
    }
  }

  private isPointInPoly(pt: { x: number; y: number }, poly: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
        (pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private bindHudEvents() {
    // 1. 2D / 3D Segmented Control
    const modeToggle = document.getElementById('hud-mode-toggle');
    modeToggle?.querySelectorAll('.seg-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const mode = target.getAttribute('data-mode');
        if (this.isSplitScreen) {
          this.disableSplitScreen();
        }
        if (mode === '3d') {
          projectStore.setViewMode('3d_main');
          showToast('Full 3D Preview Mode activated');
        } else {
          projectStore.setViewMode('2d_main');
          showToast('2D CAD Blueprint Mode activated');
        }
      });
    });

    // 2. Split screen toggle
    const btnSplit = document.getElementById('btn-hud-split');
    btnSplit?.addEventListener('click', () => {
      this.toggleSplitScreen();
    });

    // 3. Fit to extents
    const btnExtents = document.getElementById('btn-hud-extents');
    btnExtents?.addEventListener('click', () => {
      this.cadViewport.centerView();
      this.threeScene.fitToExtents();
      this.updateZoomDisplay();
      showToast('Fit to view extents');
    });

    // 4. Zoom Out & Zoom In
    const btnZoomOut = document.getElementById('btn-zoom-out');
    btnZoomOut?.addEventListener('click', () => {
      const current = this.cadViewport.getZoom();
      this.cadViewport.setZoom(current * 0.85);
      this.updateZoomDisplay();
    });

    const btnZoomIn = document.getElementById('btn-zoom-in');
    btnZoomIn?.addEventListener('click', () => {
      const current = this.cadViewport.getZoom();
      this.cadViewport.setZoom(current * 1.18);
      this.updateZoomDisplay();
    });

    // Listen to wheel on cad canvas to update zoom display
    this.cadCanvas.addEventListener('wheel', () => {
      requestAnimationFrame(() => this.updateZoomDisplay());
    });
  }

  private toggleFull3DPreview() {
    if (this.isSplitScreen) {
      this.disableSplitScreen();
    }
    const currentMode = projectStore.getState().viewMode;
    if (currentMode === '2d_main') {
      projectStore.setViewMode('3d_main');
      showToast('Switched to Full 3D Preview (Center Viewport)');
    } else {
      projectStore.setViewMode('2d_main');
      showToast('Switched to 2D CAD Blueprint View');
    }
  }

  public toggleSplitScreen() {
    this.isSplitScreen = !this.isSplitScreen;
    if (this.isSplitScreen) {
      this.centerViewport.classList.add('split-screen');
      this.pipWindow.classList.add('hidden');
      this.centerViewport.appendChild(this.cadCanvas);
      if (this.splitGutter) {
        this.centerViewport.appendChild(this.splitGutter);
      }
      this.centerViewport.appendChild(this.threeCanvas);
      this.applySplitDimensions();
      showToast('Dual Split-Screen Mode: Drag divider to resize');
    } else {
      this.disableSplitScreen();
      showToast('Exited Split-Screen Mode');
    }

    requestAnimationFrame(() => {
      this.cadViewport.resizeCanvas();
      this.threeScene.resizeCanvas();
    });
  }

  private disableSplitScreen() {
    this.isSplitScreen = false;
    this.centerViewport.classList.remove('split-screen');
    this.clearCanvasInlineStyles();
    const state = projectStore.getState();
    this.updateViewportArrangement(state.viewMode, state.pipVisible, true);
  }

  private updateViewportArrangement(viewMode: string, pipVisible: boolean, force: boolean = false) {
    if (this.isSplitScreen) return;

    // Guard: Prevent expensive DOM churn and canvas clearing when arrangement hasn't changed
    if (!force && this.lastArrangedMode === viewMode && this.lastArrangedPip === pipVisible) {
      return;
    }

    this.lastArrangedMode = viewMode;
    this.lastArrangedPip = pipVisible;

    this.clearCanvasInlineStyles();
    this.pipWindow.classList.toggle('hidden', !pipVisible);

    if (viewMode === '2d_main') {
      // 2D Canvas in Center, 3D Canvas in PiP
      this.centerViewport.appendChild(this.cadCanvas);
      this.pipContainer.appendChild(this.threeCanvas);
    } else {
      // 3D Canvas in Center, 2D Canvas in PiP (Full 3D Preview)
      this.centerViewport.appendChild(this.threeCanvas);
      this.pipContainer.appendChild(this.cadCanvas);
    }

    const tabToggle = this.pipWindow.querySelector('#pip-tab-toggle');
    if (tabToggle) {
      tabToggle.textContent = viewMode === '2d_main' ? '3D' : '2D';
      tabToggle.setAttribute('data-tab', viewMode === '2d_main' ? '3d' : '2d');
    }

    requestAnimationFrame(() => {
      this.cadViewport.resizeCanvas();
      this.threeScene.resizeCanvas();
    });
  }

  private updateHudState(viewMode: string) {
    const modeToggle = document.getElementById('hud-mode-toggle');
    if (!modeToggle) return;

    const is3D = viewMode === '3d_main';
    const btn2d = modeToggle.querySelector('[data-mode="2d"]');
    const btn3d = modeToggle.querySelector('[data-mode="3d"]');

    btn2d?.classList.toggle('active', !is3D && !this.isSplitScreen);
    btn3d?.classList.toggle('active', is3D && !this.isSplitScreen);

    const btnSplit = document.getElementById('btn-hud-split');
    btnSplit?.classList.toggle('active', this.isSplitScreen);
  }

  private updateZoomDisplay() {
    const zoomElem = document.getElementById('hud-zoom-level');
    if (!zoomElem) return;
    const z = this.cadViewport.getZoom();
    const pct = Math.round((z / 0.08) * 100);
    zoomElem.textContent = `${pct} %`;
  }
}
