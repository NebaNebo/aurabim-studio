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

  private init() {
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

  private computeQuickHash(state: ProjectState): string {
    const wallKeys = Object.keys(state.walls).length;
    const roomKeys = Object.keys(state.rooms).length;
    const furnKeys = Object.keys(state.furniture).length;
    return `${state.id}_${state.name}_${wallKeys}_${roomKeys}_${furnKeys}_${state.version}`;
  }
}

export const autoSaveManager = new AutoSaveManager();
