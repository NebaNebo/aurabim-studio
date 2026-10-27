import { ActiveTool, OpeningType, StructureType } from '../../core/types';

export type NavRailTab = 'floorplan' | 'furniture' | 'materials' | 'lighting';

export interface DockSubtypes {
  door: string;
  window: string;
  bay_window: string;
  opening: string;
  column: string;
  staircase: string;
  partition_wall: string;
  [key: string]: string;
}

export function formatSubtypeLabel(toolKey: string, val: string): string {
  switch (toolKey) {
    case 'door':
      if (val === 'double_door') return 'Double';
      if (val === 'sliding_door') return 'Sliding';
      if (val === 'unequal_double_door') return 'Unequal';
      return 'Single';
    case 'window':
      if (val === 'floor_to_ceiling_window') return 'Floor-Ceil';
      if (val === 'sliding_window') return 'Sliding';
      return 'Casement';
    case 'bay_window':
      if (val === 'trapezoid_bay') return 'Trapezoid';
      if (val === 'l_corner_bay') return 'L-Corner';
      return 'Rectangular';
    case 'column':
      if (val === 'round') return 'Round';
      if (val === 'l_shaped') return 'L-Shape';
      return 'Square';
    case 'staircase':
      if (val === 'l_shaped') return 'L-Stair';
      if (val === 'u_shaped') return 'U-Stair';
      return 'Straight';
    case 'partition_wall':
      if (val === 'glass') return 'Glass';
      if (val === 'curtain') return 'Curtain';
      return 'Half-Wall';
    default:
      return val ? val.replace(/_/g, ' ') : '';
  }
}
