import { projectStore } from '../../core/state-store';
import { showToast } from '../toast-notifier';
import { ICONS } from '../icons';

export class FinishesDockRenderer {
  public static render(container: HTMLElement): void {
    const finishes = [
      { id: 'oak_parquet', name: 'Warm Oak Parquet', type: 'floor', color: '#c4ab93' },
      { id: 'marble', name: 'Carrara White Marble', type: 'floor', color: '#f5f6f8' },
      { id: 'tile', name: 'Dark Slate Ceramic', type: 'floor', color: '#2d3748' },
      { id: 'plaster_white', name: 'Clean White Plaster', type: 'wall', color: '#f8fafc' },
      { id: 'concrete', name: 'Architectural Concrete', type: 'wall', color: '#94a3b8' }
    ];

    container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">${ICONS.finishes}</span>
          <span class="dock-breadcrumb-text">Finishes & Materials</span>
        </div>
      </div>
      <div style="padding: 0 12px 10px 12px; font-size: 11px; color: var(--text-secondary); line-height: 1.4;">
        Select a material below, then click any room or wall on the floor plan to apply:
      </div>
      <div class="dock-scroll-area">
        ${finishes.map(f => `
          <div class="material-palette-card" data-material="${f.id}">
            <div class="material-swatch-chip" style="background: ${f.color};"></div>
            <div class="catalog-item-info">
              <span class="catalog-item-name">${f.name}</span>
              <span class="catalog-item-dim">${f.type.toUpperCase()} FINISH</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('[data-material]').forEach(el => {
      el.addEventListener('click', () => {
        const matId = el.getAttribute('data-material')!;
        const sel = projectStore.getState().selection;
        if (sel.type === 'room' && sel.id) {
          projectStore.updateRoom(sel.id, { floorMaterial: matId });
          showToast(`Applied ${matId.replace(/_/g, ' ')} to floor`);
        } else {
          showToast(`Selected ${matId.replace(/_/g, ' ')}. Click a room on the floor plan!`);
        }
      });
    });
  }
}
