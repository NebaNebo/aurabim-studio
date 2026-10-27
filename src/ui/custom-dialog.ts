/**
 * AuraBIM Studio — Custom Apple Modal Dialogs
 * Replaces native alert(), confirm(), and prompt() with accessible Liquid Glass modals.
 */

export interface DialogOptions {
  type?: 'info' | 'warning' | 'danger' | 'success' | 'error';
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

export interface PromptOptions extends DialogOptions {
  placeholder?: string;
}

export function customAlert(
  title: string,
  message: string,
  opts: DialogOptions = {}
): Promise<void> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-dialog-backdrop';

    const rawType = opts.type || 'info';
    const iconType = rawType === 'error' ? 'danger' : rawType;
    const iconSymbol = iconType === 'danger' ? '⚠️' : iconType === 'warning' ? '⚠️' : iconType === 'success' ? '✓' : '🏛️';

    backdrop.innerHTML = `
      <div class="custom-dialog-card" role="alertdialog" aria-labelledby="dialog-title" aria-describedby="dialog-msg">
        <div class="custom-dialog-header">
          <div class="custom-dialog-icon ${iconType}">${iconSymbol}</div>
          <div class="custom-dialog-text">
            <h3 class="custom-dialog-title" id="dialog-title">${escapeHtml(title)}</h3>
            <p class="custom-dialog-message" id="dialog-msg">${escapeHtml(message)}</p>
          </div>
        </div>
        <div class="custom-dialog-actions">
          <button class="dialog-btn dialog-btn-primary" id="dialog-btn-ok">${escapeHtml(opts.confirmText || 'OK')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    isolateEvents(backdrop);

    const okBtn = backdrop.querySelector('#dialog-btn-ok') as HTMLButtonElement;
    okBtn?.focus();

    const cleanup = () => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        cleanup();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    okBtn?.addEventListener('click', cleanup);
  });
}

export function customConfirm(
  title: string,
  message: string,
  opts: DialogOptions = {}
): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-dialog-backdrop';

    const isDanger = opts.isDanger || opts.type === 'danger';
    const iconType = isDanger ? 'danger' : opts.type || 'warning';
    const iconSymbol = isDanger ? '🗑️' : '⚠️';
    const confirmBtnClass = isDanger ? 'dialog-btn-danger' : 'dialog-btn-primary';

    backdrop.innerHTML = `
      <div class="custom-dialog-card" role="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-msg">
        <div class="custom-dialog-header">
          <div class="custom-dialog-icon ${iconType}">${iconSymbol}</div>
          <div class="custom-dialog-text">
            <h3 class="custom-dialog-title" id="dialog-title">${escapeHtml(title)}</h3>
            <p class="custom-dialog-message" id="dialog-msg">${escapeHtml(message)}</p>
          </div>
        </div>
        <div class="custom-dialog-actions">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-btn-cancel">${escapeHtml(opts.cancelText || 'Cancel')}</button>
          <button class="dialog-btn ${confirmBtnClass}" id="dialog-btn-confirm">${escapeHtml(opts.confirmText || (isDanger ? 'Delete' : 'Confirm'))}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    isolateEvents(backdrop);

    const confirmBtn = backdrop.querySelector('#dialog-btn-confirm') as HTMLButtonElement;
    const cancelBtn = backdrop.querySelector('#dialog-btn-cancel') as HTMLButtonElement;

    if (isDanger) {
      cancelBtn?.focus();
    } else {
      confirmBtn?.focus();
    }

    const cleanup = (confirmed: boolean) => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(confirmed);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup(true);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    confirmBtn?.addEventListener('click', () => cleanup(true));
    cancelBtn?.addEventListener('click', () => cleanup(false));
  });
}

export function customPrompt(
  title: string,
  message: string,
  defaultValue: string = '',
  opts: PromptOptions = {}
): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    backdrop.className = 'custom-dialog-backdrop';

    backdrop.innerHTML = `
      <div class="custom-dialog-card" role="dialog" aria-labelledby="dialog-title">
        <div class="custom-dialog-header">
          <div class="custom-dialog-icon info">🏷️</div>
          <div class="custom-dialog-text">
            <h3 class="custom-dialog-title" id="dialog-title">${escapeHtml(title)}</h3>
            <p class="custom-dialog-message">${escapeHtml(message)}</p>
          </div>
        </div>
        <div class="custom-dialog-input-wrap">
          <input type="text" class="custom-dialog-input" id="dialog-input" value="${escapeHtml(defaultValue)}" placeholder="${escapeHtml(opts.placeholder || '')}" />
        </div>
        <div class="custom-dialog-actions">
          <button class="dialog-btn dialog-btn-secondary" id="dialog-btn-cancel">${escapeHtml(opts.cancelText || 'Cancel')}</button>
          <button class="dialog-btn dialog-btn-primary" id="dialog-btn-confirm">${escapeHtml(opts.confirmText || 'Save')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    isolateEvents(backdrop);

    const input = backdrop.querySelector('#dialog-input') as HTMLInputElement;
    const confirmBtn = backdrop.querySelector('#dialog-btn-confirm') as HTMLButtonElement;
    const cancelBtn = backdrop.querySelector('#dialog-btn-cancel') as HTMLButtonElement;

    input?.focus();
    input?.select();

    const cleanup = (val: string | null) => {
      document.removeEventListener('keydown', onKeyDown);
      backdrop.remove();
      resolve(val);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        cleanup(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        cleanup(input.value.trim());
      }
    };

    document.addEventListener('keydown', onKeyDown);
    confirmBtn?.addEventListener('click', () => cleanup(input.value.trim()));
    cancelBtn?.addEventListener('click', () => cleanup(null));
  });
}

function isolateEvents(element: HTMLElement) {
  ['pointerdown', 'mousedown', 'touchstart', 'click', 'dblclick', 'wheel'].forEach(evt => {
    element.addEventListener(evt, e => e.stopPropagation());
  });
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
