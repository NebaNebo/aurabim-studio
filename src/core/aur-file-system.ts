/**
 * AuraBIM Studio — .aur Native File System Format
 * Specification & Packager for .aur (AuraBIM Project Archive) containers.
 */

import { ProjectState } from './types';

export interface AurArchiveMeta {
  name: string;
  createdAt: number;
  exportedAt: number;
  generator: string;
  appVersion: string;
  stats: {
    wallCount: number;
    roomCount: number;
    furnitureCount: number;
    totalAreaM2: number;
  };
  thumbnailUrl?: string;
}

export interface AurArchive {
  format: 'AURABIM_CONTAINER';
  version: '1.0';
  fileExtension: '.aur';
  meta: AurArchiveMeta;
  projectState: ProjectState;
  checksum: string;
}

/**
 * Creates an .aur archive structure from a ProjectState
 */
export function createAurArchive(state: ProjectState, thumbnailUrl?: string): AurArchive {
  const wallCount = Object.keys(state.walls || {}).length;
  const roomCount = Object.keys(state.rooms || {}).length;
  const furnitureCount = Object.keys(state.furniture || {}).length;

  let totalAreaM2 = 0;
  for (const r of Object.values(state.rooms || {})) {
    totalAreaM2 += r.areaSquareMeters || 0;
  }
  totalAreaM2 = Math.round(totalAreaM2 * 10) / 10;

  const now = Date.now();
  const meta: AurArchiveMeta = {
    name: state.name || 'Architectural Design',
    createdAt: state.id && state.id.includes('_') ? parseInt(state.id.split('_')[1], 10) || now : now,
    exportedAt: now,
    generator: 'AuraBIM Studio CAD & 3D Spatial Engine',
    appVersion: '1.0.0',
    stats: {
      wallCount,
      roomCount,
      furnitureCount,
      totalAreaM2
    },
    thumbnailUrl
  };

  const simpleChecksum = `aur_${Math.abs(hashString(JSON.stringify(state) + now)).toString(16)}`;

  return {
    format: 'AURABIM_CONTAINER',
    version: '1.0',
    fileExtension: '.aur',
    meta,
    projectState: state,
    checksum: simpleChecksum
  };
}

/**
 * Triggers a browser file download of an .aur archive
 */
export function exportAsAurFile(state: ProjectState, thumbnailUrl?: string): void {
  const archive = createAurArchive(state, thumbnailUrl);
  const jsonStr = JSON.stringify(archive, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const safeFilename = (state.name || 'aurabim_project')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_');

  a.href = url;
  a.download = `${safeFilename}.aur`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses and validates an imported .aur or legacy .json file string
 */
export function parseAurOrJson(fileContent: string): {
  state: ProjectState;
  isAur: boolean;
  meta?: AurArchiveMeta;
} {
  const parsed = JSON.parse(fileContent);

  // 1. Check if it is a native .aur container
  if (parsed.format === 'AURABIM_CONTAINER' && parsed.projectState) {
    const state = parsed.projectState as ProjectState;
    if (state.nodes && state.walls) {
      return {
        state,
        isAur: true,
        meta: parsed.meta
      };
    }
  }

  // 2. Backward compatibility for legacy raw ProjectState JSON
  if (parsed.nodes && parsed.walls) {
    return {
      state: parsed as ProjectState,
      isAur: false
    };
  }

  throw new Error('Unrecognized format: File is neither a valid .aur archive nor an AuraBIM JSON blueprint.');
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}
