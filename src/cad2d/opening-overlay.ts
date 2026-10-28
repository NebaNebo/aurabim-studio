import { HoverOpeningPreview, Opening, Wall, Point2D } from '../core/types';
import { projectStore } from '../core/state-store';
import { CadViewport } from './cad-viewport';

export interface OverlayCallbacks {
  onUpdateClearance: (side: 'left' | 'right', newClearanceMm: number) => void;
  onUpdateWidth: (newWidthMm: number) => void;
  onCommitHover: () => void;
  onFlipSwing: () => void;
  onFlipHinge: () => void;
  onDelete: () => void;
}

export class OpeningOverlay {
  private overlayRoot: HTMLElement;
  private cadViewport: CadViewport;
  private callbacks: OverlayCallbacks;

  private leftInput: HTMLInputElement | null = null;
  private centerInput: HTMLInputElement | null = null;
  private rightInput: HTMLInputElement | null = null;
  private toolbar: HTMLElement | null = null;

  private currentPreview: HoverOpeningPreview | null = null;
  private currentOpening: Opening | null = null;
  private isEditingInput: boolean = false;

  constructor(overlayRoot: HTMLElement, cadViewport: CadViewport, callbacks: OverlayCallbacks) {
    this.overlayRoot = overlayRoot;
    this.cadViewport = cadViewport;
    this.callbacks = callbacks;
    this.setupContainer();
  }

  private setupContainer() {
    this.overlayRoot.innerHTML = `
      <div id="opening-inputs-container" style="position: absolute; inset: 0; pointer-events: none; overflow: hidden;">
        <input type="number" id="dim-input-left" class="opening-dim-input" title="Left Clearance (mm) - Press Enter to Apply, Tab to Next" />
        <input type="number" id="dim-input-center" class="opening-dim-input opening-dim-center" title="Opening Width (mm)" />
        <input type="number" id="dim-input-right" class="opening-dim-input" title="Right Clearance (mm) - Press Enter to Apply, Tab to Next" />
        
        <div id="opening-floating-toolbar" class="opening-toolbar">
          <button class="btn btn-sm" id="btn-float-swing" title="Flip Swing Side (Spacebar)">🔄 Flip Swing</button>
          <button class="btn btn-sm" id="btn-float-hinge" title="Flip Hinge Side">↔ Flip Hinge</button>
          <button class="btn btn-sm btn-danger" id="btn-float-del" title="Delete Opening">🗑️ Delete</button>
        </div>
      </div>
    `;

    this.leftInput = this.overlayRoot.querySelector('#dim-input-left');
    this.centerInput = this.overlayRoot.querySelector('#dim-input-center');
    this.rightInput = this.overlayRoot.querySelector('#dim-input-right');
    this.toolbar = this.overlayRoot.querySelector('#opening-floating-toolbar');

    this.bindEvents();
    this.hide();
  }

  private bindEvents() {
    if (!this.leftInput || !this.centerInput || !this.rightInput || !this.toolbar) return;

    // Pointer Event Isolation: prevent clicking/typing from bubbling to canvas
    [this.leftInput, this.centerInput, this.rightInput, this.toolbar].forEach(el => {
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('mousedown', (e) => e.stopPropagation());
      el.addEventListener('click', (e) => e.stopPropagation());
    });

    // Track input focus so mousemove doesn't overwrite user's typing
    [this.leftInput, this.centerInput, this.rightInput].forEach(inp => {
      inp.addEventListener('focus', () => {
        this.isEditingInput = true;
        inp.select();
      });
      inp.addEventListener('blur', () => {
        this.isEditingInput = false;
      });
    });

    // Left input
    this.leftInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = Math.max(0, parseInt(this.leftInput!.value, 10) || 0);
        this.callbacks.onUpdateClearance('left', val);
        this.leftInput!.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.rightInput?.focus();
      }
    });
    this.leftInput.addEventListener('change', () => {
      const val = Math.max(0, parseInt(this.leftInput!.value, 10) || 0);
      this.callbacks.onUpdateClearance('left', val);
    });

    // Center input (Width)
    this.centerInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = Math.max(300, parseInt(this.centerInput!.value, 10) || 907);
        this.callbacks.onUpdateWidth(val);
        this.centerInput!.blur();
      }
    });
    this.centerInput.addEventListener('change', () => {
      const val = Math.max(300, parseInt(this.centerInput!.value, 10) || 907);
      this.callbacks.onUpdateWidth(val);
    });

    // Right input
    this.rightInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const val = Math.max(0, parseInt(this.rightInput!.value, 10) || 0);
        this.callbacks.onUpdateClearance('right', val);
        this.rightInput!.blur();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.leftInput?.focus();
      }
    });
    this.rightInput.addEventListener('change', () => {
      const val = Math.max(0, parseInt(this.rightInput!.value, 10) || 0);
      this.callbacks.onUpdateClearance('right', val);
    });

    // Toolbar buttons
    this.toolbar.querySelector('#btn-float-swing')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onFlipSwing();
    });
    this.toolbar.querySelector('#btn-float-hinge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onFlipHinge();
    });
    this.toolbar.querySelector('#btn-float-del')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.callbacks.onDelete();
    });
  }

  public focusLeftInput() {
    if (this.leftInput && this.leftInput.style.display !== 'none') {
      this.leftInput.focus();
      this.leftInput.select();
    }
  }

  public focusRightInput() {
    if (this.rightInput && this.rightInput.style.display !== 'none') {
      this.rightInput.focus();
      this.rightInput.select();
    }
  }

  public hide() {
    if (this.leftInput) this.leftInput.style.display = 'none';
    if (this.centerInput) this.centerInput.style.display = 'none';
    if (this.rightInput) this.rightInput.style.display = 'none';
    if (this.toolbar) this.toolbar.style.display = 'none';
    this.currentPreview = null;
    this.currentOpening = null;
  }

  /**
   * Updates floating HTML overlay positions based on world coordinates.
   */
  public update(
    preview: HoverOpeningPreview | null,
    selectedOpening: Opening | null,
    wall: Wall | null,
    nodes: Record<string, Point2D>
  ) {
    if (!preview && !selectedOpening) {
      this.hide();
      return;
    }

    if (!wall) {
      this.hide();
      return;
    }

    const p1 = nodes[wall.startNodeId];
    const p2 = nodes[wall.endNodeId];
    if (!p1 || !p2) {
      this.hide();
      return;
    }

    const wallLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (wallLen < 1) {
      this.hide();
      return;
    }

    const dirX = (p2.x - p1.x) / wallLen;
    const dirY = (p2.y - p1.y) / wallLen;

    // Normal vector perpendicular to wall
    const normX = -dirY;
    const normY = dirX;

    // Determine target parameters (from preview or selected opening)
    let offset = 0;
    let width = 907;
    let swingSide: 1 | -1 = 1;
    let leftObs = wall.thickness / 2;
    let rightObs = wallLen - wall.thickness / 2;
    let leftClr = 0;
    let rightClr = 0;
    let isSelectedMode = false;

    if (preview && preview.wallId === wall.id) {
      offset = preview.offset;
      width = preview.width;
      swingSide = preview.swingSide;
      leftObs = preview.leftObstacleOffset;
      rightObs = preview.rightObstacleOffset;
      leftClr = preview.leftClearanceMm;
      rightClr = preview.rightClearanceMm;
    } else if (selectedOpening) {
      offset = selectedOpening.offset ?? selectedOpening.offsetFromStart ?? 0;
      width = selectedOpening.width;
      swingSide = selectedOpening.swingSide ?? 1;
      isSelectedMode = true;

      // Calculate obstacles for selected opening
      leftObs = wall.thickness / 2;
      rightObs = wallLen - wall.thickness / 2;
      for (const ex of wall.openings) {
        if (ex.id === selectedOpening.id) continue;
        const exOff = ex.offset ?? ex.offsetFromStart ?? 0;
        if (exOff + ex.width / 2 <= offset - width / 2) {
          leftObs = Math.max(leftObs, exOff + ex.width / 2);
        }
        if (exOff - ex.width / 2 >= offset + width / 2) {
          rightObs = Math.min(rightObs, exOff - ex.width / 2);
        }
      }
      leftClr = Math.max(0, Math.round((offset - width / 2) - leftObs));
      rightClr = Math.max(0, Math.round(rightObs - (offset + width / 2)));
    }

    // Offset line perpendicular distance (350mm offset from wall face on swingSide)
    const dimLineOffset = (wall.thickness / 2 + 350) * swingSide;

    // Left span midpoint
    const leftMidOffset = (leftObs + (offset - width / 2)) / 2;
    const leftWorld = {
      x: p1.x + dirX * leftMidOffset + normX * dimLineOffset,
      y: p1.y + dirY * leftMidOffset + normY * dimLineOffset
    };

    // Center midpoint
    const centerWorld = {
      x: p1.x + dirX * offset + normX * dimLineOffset,
      y: p1.y + dirY * offset + normY * dimLineOffset
    };

    // Right span midpoint
    const rightMidOffset = ((offset + width / 2) + rightObs) / 2;
    const rightWorld = {
      x: p1.x + dirX * rightMidOffset + normX * dimLineOffset,
      y: p1.y + dirY * rightMidOffset + normY * dimLineOffset
    };

    // Convert to screen pixels
    const leftScr = this.cadViewport.worldToScreen(leftWorld);
    const centerScr = this.cadViewport.worldToScreen(centerWorld);
    const rightScr = this.cadViewport.worldToScreen(rightWorld);

    // Update Input values (unless user is currently typing in them)
    if (!this.isEditingInput) {
      if (this.leftInput) this.leftInput.value = leftClr.toString();
      if (this.centerInput) this.centerInput.value = width.toString();
      if (this.rightInput) this.rightInput.value = rightClr.toString();
    }

    // Position Left input
    if (this.leftInput) {
      this.leftInput.style.display = 'block';
      this.leftInput.style.left = `${leftScr.x}px`;
      this.leftInput.style.top = `${leftScr.y}px`;
    }

    // Position Center input
    if (this.centerInput) {
      this.centerInput.style.display = 'block';
      this.centerInput.style.left = `${centerScr.x}px`;
      this.centerInput.style.top = `${centerScr.y}px`;
    }

    // Position Right input
    if (this.rightInput) {
      this.rightInput.style.display = 'block';
      this.rightInput.style.left = `${rightScr.x}px`;
      this.rightInput.style.top = `${rightScr.y}px`;
    }

    // Floating Toolbar for selected opening
    if (this.toolbar) {
      if (isSelectedMode) {
        const toolbarOffset = (wall.thickness / 2 + 550) * swingSide;
        const tbWorld = {
          x: p1.x + dirX * offset + normX * toolbarOffset,
          y: p1.y + dirY * offset + normY * toolbarOffset
        };
        const tbScr = this.cadViewport.worldToScreen(tbWorld);
        this.toolbar.style.display = 'flex';
        this.toolbar.style.left = `${tbScr.x}px`;
        this.toolbar.style.top = `${tbScr.y}px`;
      } else {
        this.toolbar.style.display = 'none';
      }
    }
  }
}
