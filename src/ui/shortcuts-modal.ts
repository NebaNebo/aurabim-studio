/**
 * Keyboard & Mouse Shortcuts Reference Modal
 */
export function openShortcutsModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay open';
  overlay.innerHTML = `
    <div class="modal-box" style="max-width: 480px;">
      <div class="modal-header">
        <span class="modal-title">⌨️ Keyboard & Mouse Controls</span>
        <button class="btn btn-sm btn-icon" id="modal-close">✕</button>
      </div>
      <div class="modal-body" style="gap: 10px; font-size: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Draw Straight Wall</span>
          <kbd class="tool-shortcut-badge">B</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Draw Rectangle Room</span>
          <kbd class="tool-shortcut-badge">F</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Select & Move Tool</span>
          <kbd class="tool-shortcut-badge">V / Esc</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Flip Door Swing Direction</span>
          <kbd class="tool-shortcut-badge">Spacebar</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Delete Selected Element</span>
          <kbd class="tool-shortcut-badge">Del / Backspace</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Undo / Redo</span>
          <kbd class="tool-shortcut-badge">Ctrl+Z / Ctrl+Y</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-subtle);">
          <span>Pan 2D Canvas</span>
          <span style="color: var(--text-secondary); font-size: 11px;">Middle Drag or Right Drag</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 0;">
          <span>3D Orbit & Zoom</span>
          <span style="color: var(--text-secondary); font-size: 11px;">Left Drag / Wheel Scroll</span>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-sm btn-primary" id="modal-ok">Got it</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('#modal-close')?.addEventListener('click', close);
  overlay.querySelector('#modal-ok')?.addEventListener('click', close);
}
