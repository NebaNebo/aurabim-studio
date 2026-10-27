import {
  createBlankCanvasTemplate,
  createCoohomCurvedShowcaseTemplate,
  createTwoBedroomSuiteTemplate,
  createModernStudioTemplate
} from '../../core/templates';
import { ProjectState } from '../../core/types';

export type TemplateChoice = 'blank' | 'curved_penthouse' | 'two_bedroom' | 'studio_loft';

export interface NewProjectOptions {
  name: string;
  templateType: TemplateChoice;
  initialState: ProjectState;
}

export class NewProjectModal {
  private container: HTMLElement;
  private selectedTemplate: TemplateChoice = 'blank';
  private onCreateCallback?: (opts: NewProjectOptions) => void;

  constructor(container: HTMLElement, onCreate?: (opts: NewProjectOptions) => void) {
    this.container = container;
    this.onCreateCallback = onCreate;
    this.hide();
  }

  public show() {
    this.selectedTemplate = 'blank';
    this.render();
    this.bindEvents();
    this.container.style.display = 'flex';
    setTimeout(() => {
      const input = this.container.querySelector('#new-proj-name') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    }, 60);
  }

  public hide() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
  }

  private render() {
    this.container.innerHTML = `
      <div class="new-proj-backdrop">
        <div class="new-proj-card" role="dialog" aria-labelledby="modal-title">
          <div class="new-proj-header">
            <div>
              <h2 class="new-proj-title" id="modal-title">Create New Project</h2>
              <p class="new-proj-subtitle">Choose a starting template or begin with a clean blank canvas.</p>
            </div>
            <button class="new-proj-close-btn" id="btn-close-modal">✕</button>
          </div>

          <div class="new-proj-field">
            <label class="new-proj-label" for="new-proj-name">Project Title</label>
            <input type="text" id="new-proj-name" class="new-proj-input" value="Modern Residence 01" placeholder="e.g. Sunset Boulevard Villa" />
          </div>

          <div class="template-section-label">Select Starting Template:</div>
          <div class="template-grid">
            <div class="template-card ${this.selectedTemplate === 'blank' ? 'active' : ''}" data-template="blank">
              <div class="template-card-icon">📐</div>
              <div class="template-card-name">Blank Canvas</div>
              <div class="template-card-desc">Zero walls, clean isometric grid. Ideal for custom floor planning from scratch.</div>
              <div class="template-card-pill">0 m² · Empty</div>
            </div>

            <div class="template-card ${this.selectedTemplate === 'curved_penthouse' ? 'active' : ''}" data-template="curved_penthouse">
              <div class="template-card-icon">🏙️</div>
              <div class="template-card-name">Curved Penthouse</div>
              <div class="template-card-desc">Luxury Coohom penthouse with curved walls, bay windows, master suite, and living room.</div>
              <div class="template-card-pill popular">★ Featured · 86 m²</div>
            </div>

            <div class="template-card ${this.selectedTemplate === 'two_bedroom' ? 'active' : ''}" data-template="two_bedroom">
              <div class="template-card-icon">🏡</div>
              <div class="template-card-name">Modern 2-Bedroom</div>
              <div class="template-card-desc">Open-plan kitchen, 2 bedrooms, bathroom, and balcony. Great for apartments.</div>
              <div class="template-card-pill">74 m² · Furnished</div>
            </div>

            <div class="template-card ${this.selectedTemplate === 'studio_loft' ? 'active' : ''}" data-template="studio_loft">
              <div class="template-card-icon">🏢</div>
              <div class="template-card-name">Urban Studio Loft</div>
              <div class="template-card-desc">Compact open-concept studio apartment with partitioned living and sleeping zones.</div>
              <div class="template-card-pill">40 m² · Studio</div>
            </div>
          </div>

          <div class="new-proj-footer">
            <button class="btn btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button class="btn btn-primary-emerald" id="btn-create-launch">
              <span>Create & Launch Studio</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'].forEach(evt => {
      this.container.addEventListener(evt, e => e.stopPropagation());
    });

    this.container.querySelector('#btn-close-modal')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#btn-cancel-modal')?.addEventListener('click', () => this.hide());

    const cards = this.container.querySelectorAll('.template-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        this.selectedTemplate = card.getAttribute('data-template') as TemplateChoice;
      });
    });

    const nameInput = this.container.querySelector('#new-proj-name') as HTMLInputElement | null;
    const createBtn = this.container.querySelector('#btn-create-launch') as HTMLButtonElement | null;

    nameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        createBtn?.click();
      }
    });

    createBtn?.addEventListener('click', () => {
      const name = nameInput?.value.trim() || 'Modern Residence';
      const newId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      let state: ProjectState;
      if (this.selectedTemplate === 'curved_penthouse') {
        state = createCoohomCurvedShowcaseTemplate();
      } else if (this.selectedTemplate === 'two_bedroom') {
        state = createTwoBedroomSuiteTemplate();
      } else if (this.selectedTemplate === 'studio_loft') {
        state = createModernStudioTemplate();
      } else {
        state = createBlankCanvasTemplate();
      }

      state.id = newId;
      state.name = name;

      this.hide();
      this.onCreateCallback?.({
        name,
        templateType: this.selectedTemplate,
        initialState: state
      });
    });
  }
}
