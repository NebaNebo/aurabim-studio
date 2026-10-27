import { projectStore } from '../core/state-store';
import { projectRepository } from './project-repository';
import { authService } from './auth-service';
import { captureAndUploadCanvasThumbnail } from './cloudinary-service';
import { ProjectState } from '../core/types';

export type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';
export type SaveStatusListener = (status: AutoSaveStatus, lastSavedAt?: Date) => void;

class AutoSaveManager {
  private debounceTimer: any = null;
  private currentStatus: AutoSaveStatus = 'idle';
  private lastSavedTime: Date | null = null;
  private listeners: Set<SaveStatusListener> = new Set();
  private isEnabled: boolean = true;
  private lastSavedHash: string = '';
  private changeCounter: number = 0;
  private activeCanvas: HTMLCanvasElement | null = null;

  constructor() {
    this.init();
  }

  public setCanvasReference(canvas: HTMLCanvasElement) {
    this.activeCanvas = canvas;
  }

  public onStatusChange(listener: SaveStatusListener): () => void {
    this.listeners.add(listener);
    listener(this.currentStatus, this.lastSavedTime || undefined);
    return () => this.listeners.delete(listener);
  }

  private setStatus(status: AutoSaveStatus) {
    this.currentStatus = status;
    for (const l of this.listeners) {
      l(status, this.lastSavedTime || undefined);
    }
  }

  public markAsSaved(state: ProjectState) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.lastSavedHash = this.computeQuickHash(state);
    this.lastSavedTime = new Date();
    this.setStatus('saved');
  }

  private init() {
    // Initialize hash with current state to prevent saving unwanted default dummy projects on boot
    const initialState = projectStore.getState();
    this.lastSavedHash = this.computeQuickHash(initialState);

    projectStore.subscribe((state: ProjectState) => {
      if (!this.isEnabled) return;

      const stateHash = this.computeQuickHash(state);
      if (stateHash === this.lastSavedHash) return;

      this.setStatus('saving');
      this.changeCounter++;

      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }

      this.debounceTimer = setTimeout(() => {
        this.performSave(state, stateHash);
      }, 1500);
    });

    // Synchronously flush changes to disk if user closes or reloads page
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flushSync());
      window.addEventListener('pagehide', () => this.flushSync());
    }
  }

  private async performSave(state: ProjectState, stateHash: string) {
    const user = authService.getCurrentUser();
    const userId = user ? user.uid : 'guest_local';

    try {
      let thumbnailUrl: string | undefined = undefined;

      // Every 3 significant saves, capture and upload fresh canvas thumbnail to Cloudinary
      if (this.activeCanvas && this.changeCounter % 3 === 0) {
        try {
          thumbnailUrl = await captureAndUploadCanvasThumbnail(this.activeCanvas, state.id);
        } catch (err) {
          console.warn('Auto-save thumbnail upload note:', err);
        }
      }

      await projectRepository.saveProject(userId, state, thumbnailUrl);

      this.lastSavedHash = stateHash;
      this.lastSavedTime = new Date();
      this.setStatus('saved');

      // Return to idle after 3s display
      setTimeout(() => {
        if (this.currentStatus === 'saved') {
          this.setStatus('idle');
        }
      }, 3500);
    } catch (err) {
      console.error('Auto-save failed:', err);
      this.setStatus('error');
    }
  }

  /**
   * Immediately saves the project without waiting for debounce
   */
  public async forceSaveNow(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const state = projectStore.getState();
    const hash = this.computeQuickHash(state);
    await this.performSave(state, hash);
  }

  /**
   * Synchronously flushes unsaved state to LocalStorage
   */
  public flushSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    const state = projectStore.getState();
    const stateHash = this.computeQuickHash(state);
    if (stateHash !== this.lastSavedHash) {
      const user = authService.getCurrentUser();
      const userId = user ? user.uid : 'guest_local';
      projectRepository.saveProjectSync(userId, state);
      this.lastSavedHash = stateHash;
      this.lastSavedTime = new Date();
      this.setStatus('saved');
    }
  }

  public computeQuickHash(state: ProjectState): string {
    let nodeChecksum = 0;
    for (const n of Object.values(state.nodes || {})) {
      nodeChecksum = (nodeChecksum + (n.x * 31 + n.y * 17)) | 0;
    }
    let openingCount = 0;
    for (const w of Object.values(state.walls || {})) {
      openingCount += (w.openings?.length || 0);
    }
    const wallCount = Object.keys(state.walls || {}).length;
    const roomCount = Object.keys(state.rooms || {}).length;
    const furnCount = Object.keys(state.furniture || {}).length;
    const structCount = Object.keys(state.structures || {}).length;
    return `${state.id}_${state.name}_w${wallCount}_n${nodeChecksum}_o${openingCount}_r${roomCount}_f${furnCount}_s${structCount}`;
  }
}

export const autoSaveManager = new AutoSaveManager();
