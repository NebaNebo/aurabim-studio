import { FURNITURE_CATALOG, CatalogItemDefinition } from '../../catalog/furniture-presets';
import { ICONS } from '../icons';

export class FurnitureDockRenderer {
  public static render(
    container: HTMLElement, 
    selectedCategory: string, 
    searchQuery: string,
    onCategoryChange: (cat: string) => void
  ): void {
    const categories = [
      { id: 'all', label: 'All' },
      { id: 'seating', label: 'Living' },
      { id: 'beds', label: 'Bedroom' },
      { id: 'tables', label: 'Dining' },
      { id: 'storage', label: 'Storage' },
      { id: 'plants', label: 'Decor' }
    ];

    let items = selectedCategory === 'all'
      ? FURNITURE_CATALOG
      : FURNITURE_CATALOG.filter(i => i.category === selectedCategory);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }

    container.innerHTML = `
      <div class="dock-header-bar">
        <div class="dock-breadcrumb-pill">
          <span class="dock-breadcrumb-icon">${ICONS.furniture}</span>
          <span class="dock-breadcrumb-text">Furniture Catalog</span>
        </div>
        <button class="dock-select-btn" id="btn-select-tool" title="Select & Move (V / Esc)">
          ${ICONS.cursorSelect}
        </button>
      </div>

      <div class="dock-search-wrap">
        <span class="dock-search-icon">${ICONS.search}</span>
        <input 
          type="text" 
          class="dock-search-input" 
          id="input-dock-search" 
          placeholder="Search 3D catalog items..." 
          value="${escapeAttr(searchQuery)}" 
        />
      </div>

      <div style="display: flex; gap: 4px; padding: 0 12px 8px 12px; overflow-x: auto;">
        ${categories.map(c => `
          <button class="tool-subchip ${selectedCategory === c.id ? 'active' : ''}" data-cat="${c.id}">
            ${c.label}
          </button>
        `).join('')}
      </div>

      <div class="dock-scroll-area">
        ${items.map(item => `
          <div class="catalog-item-card" data-furniture="${item.id}" title="${item.description}">
            <div class="catalog-item-icon">${item.icon}</div>
            <div class="catalog-item-info">
              <span class="catalog-item-name">${item.name}</span>
              <span class="catalog-item-dim">${item.dimensions.width} × ${item.dimensions.depth} mm</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('[data-cat]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.getAttribute('data-cat') || 'all';
        onCategoryChange(cat);
      });
    });
  }
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;');
}
