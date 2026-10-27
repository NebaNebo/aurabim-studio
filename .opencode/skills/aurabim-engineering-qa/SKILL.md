---
name: aurabim-engineering-qa
description: >-
  AuraBIM Studio engineering and QA standards: strict separation of concerns,
  file size limits (<=350 lines), Three.js 3D memory safety & resource disposal,
  pointer event isolation on floating panels, input hotkey guards, label collision & zoom scaling,
  mandatory Vitest unit testing protocol, browser verification definition of done, and conventional git discipline.
---

# AuraBIM Studio — AI Agent Engineering & QA Skill

## 1. Architecture & Organization Rules
- **Strict Separation of Concerns:** Never mix 2D/3D math with UI component code. All geometry calculations (wall intersections, arc tessellation, room area `m²`, grid snapping) MUST live in pure TypeScript functions inside `src/core/`.
- **File Size Limit:** No file may exceed 350 lines. Refactor large components into modular sub-components immediately.
- **3D Memory Safety:** Every Three.js `BufferGeometry`, `Material`, and `Texture` created dynamically MUST be explicitly `.dispose()`d when walls or openings are updated or deleted.

## 2. UI/UX & Canvas Polish Standards
- **Pointer Event Isolation:** Floating UI panels (like the draggable `[3D | Rooms | Drawing]` PiP window, toolbars, and Inspector) must stop pointer event propagation so dragging or clicking UI never triggers `<canvas>` drawing underneath.
- **Input Hotkey Guard:** Global keyboard shortcuts (`B`, `F`, `H`, `Tab`, `Delete`, `Backspace`) MUST be disabled whenever an `<input>` or `<select>` element (e.g., Wall Height `2800`, Thickness `240`) is focused.
- **Label Collision & Zoom Scaling:** 2D dimension badges (`11,709 mm`) and room area labels must scale inversely with canvas zoom (15% to 400%) to remain readable and avoid overlapping each other.

## 3. Mandatory Testing Protocol (Definition of Done)
Before declaring any feature or bugfix complete, the agent MUST:
1. **Unit Test the Math (Vitest):** Write or update a `.test.ts` file in `tests/unit/` covering happy paths and edge cases (0mm wall clicks, negative thickness inputs, self-intersecting walls).
2. **Verify in Browser (Playwright MCP):**
   - Open `http://localhost:5173`.
   - Test the tool interaction and verify that the bottom status bar (`Walls: X | Rooms: Y (Z m²) | Furniture: W`) and Right Inspector (`SPATIAL SUMMARY`) match 1:1.
   - Click Undo (`↩`) and Redo (`↪`) to verify state integrity.
   - Check browser console for zero runtime errors or `NaN` warnings.

## 4. Version Control (Git) Discipline
- Never make giant "vibe commits". Commit in small, atomic steps using Conventional Commits:
  - `feat(cad): ...` for new tools (e.g., Bay Window, Column)
  - `fix(geometry): ...` for area or miter calculations
  - `test(qa): ...` for Vitest/Playwright tests
  - `style(ui): ...` for layout and floating panel polish
- All `vitest run` and `tsc --noEmit` checks must pass before committing.
