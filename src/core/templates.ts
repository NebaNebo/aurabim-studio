import { ProjectState } from './types';

export function createModernStudioTemplate(): ProjectState {
  return {
    version: '1.0.0',
    id: 'template_studio_01',
    name: 'Modern Studio Apartment',
    settings: {
      wallHeight: 2800,
      wallThickness: 200,
      slabThickness: 150,
      gridSizeMm: 100,
      snapAngleDeg: 45,
      measurementUnit: 'mm',
      floorOpacity: 1.0,
      autoCutawayWall: true
    },
    nodes: {
      n_c1: { id: 'n_c1', x: 0, y: 0 },
      n_c2: { id: 'n_c2', x: 7200, y: 0 },
      n_c3: { id: 'n_c3', x: 7200, y: 5600 },
      n_c4: { id: 'n_c4', x: 0, y: 5600 },

      n_b1: { id: 'n_b1', x: 2600, y: 0 },
      n_b2: { id: 'n_b2', x: 2600, y: 2400 },
      n_b3: { id: 'n_b3', x: 0, y: 2400 }
    },
    walls: {
      w_top_left: {
        id: 'w_top_left',
        startNodeId: 'n_c1',
        endNodeId: 'n_b1',
        thickness: 200,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_top_right: {
        id: 'w_top_right',
        startNodeId: 'n_b1',
        endNodeId: 'n_c2',
        thickness: 200,
        height: 2800,
        openings: [
          {
            id: 'op_win_top',
            wallId: 'w_top_right',
            type: 'window',
            offset: 2300,
            offsetFromStart: 2300,
            width: 1800,
            height: 1400,
            sillHeight: 800,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_right: {
        id: 'w_right',
        startNodeId: 'n_c2',
        endNodeId: 'n_c3',
        thickness: 200,
        height: 2800,
        openings: [
          {
            id: 'op_win_right',
            wallId: 'w_right',
            type: 'bay_window',
            offset: 2800,
            offsetFromStart: 2800,
            width: 2200,
            height: 1800,
            sillHeight: 500,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_bottom: {
        id: 'w_bottom',
        startNodeId: 'n_c3',
        endNodeId: 'n_c4',
        thickness: 200,
        height: 2800,
        openings: [
          {
            id: 'op_door_main',
            wallId: 'w_bottom',
            type: 'door',
            offset: 5300,
            offsetFromStart: 5300,
            width: 907,
            height: 2150,
            sillHeight: 0,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_left_bottom: {
        id: 'w_left_bottom',
        startNodeId: 'n_c4',
        endNodeId: 'n_b3',
        thickness: 200,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_left_top: {
        id: 'w_left_top',
        startNodeId: 'n_b3',
        endNodeId: 'n_c1',
        thickness: 200,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },

      w_bath_right: {
        id: 'w_bath_right',
        startNodeId: 'n_b1',
        endNodeId: 'n_b2',
        thickness: 150,
        height: 2800,
        openings: [
          {
            id: 'op_bath_door',
            wallId: 'w_bath_right',
            type: 'door',
            offset: 1200,
            offsetFromStart: 1200,
            width: 800,
            height: 2100,
            sillHeight: 0,
            swingSide: -1,
            hingeSide: 'left'
          }
        ],
        exteriorMaterial: 'white_plaster',
        interiorMaterial: 'ceramic_tile'
      },
      w_bath_bottom: {
        id: 'w_bath_bottom',
        startNodeId: 'n_b2',
        endNodeId: 'n_b3',
        thickness: 150,
        height: 2800,
        openings: [],
        exteriorMaterial: 'white_plaster',
        interiorMaterial: 'ceramic_tile'
      }
    },
    rooms: {},
    furniture: {
      f_sofa: {
        id: 'f_sofa',
        catalogId: 'sofa_3seater',
        name: 'Nordic 3-Seater Sofa',
        category: 'seating',
        position: { x: 5000, y: 3800, z: 0 },
        rotation: 0,
        dimensions: { width: 2200, depth: 950, height: 820 },
        colorTint: '#3f4e5f',
        modelType: 'sofa'
      },
      f_rug: {
        id: 'f_rug',
        catalogId: 'area_rug_large',
        name: 'Geometric Area Rug',
        category: 'decor',
        position: { x: 5000, y: 3200, z: 0 },
        rotation: 0,
        dimensions: { width: 2400, depth: 1600, height: 15 },
        colorTint: '#cbd5e1',
        modelType: 'rug'
      },
      f_coffee: {
        id: 'f_coffee',
        catalogId: 'coffee_table_round',
        name: 'Round Oak Coffee Table',
        category: 'tables',
        position: { x: 5000, y: 3000, z: 0 },
        rotation: 0,
        dimensions: { width: 900, depth: 900, height: 420 },
        colorTint: '#b58855',
        modelType: 'table'
      },
      f_tv: {
        id: 'f_tv',
        catalogId: 'tv_console_media',
        name: 'Media Console & TV',
        category: 'storage',
        position: { x: 5000, y: 1600, z: 0 },
        rotation: 180,
        dimensions: { width: 1900, depth: 450, height: 1200 },
        colorTint: '#1e293b',
        modelType: 'storage'
      },
      f_bed: {
        id: 'f_bed',
        catalogId: 'bed_king_deluxe',
        name: 'King Bed & Headboard',
        category: 'beds',
        position: { x: 1400, y: 4200, z: 0 },
        rotation: 0,
        dimensions: { width: 1950, depth: 2150, height: 1050 },
        colorTint: '#e2e8f0',
        modelType: 'bed'
      },
      f_nightstand: {
        id: 'f_nightstand',
        catalogId: 'nightstand_modern',
        name: 'Oak Nightstand',
        category: 'tables',
        position: { x: 2600, y: 4200, z: 0 },
        rotation: 0,
        dimensions: { width: 500, depth: 450, height: 500 },
        colorTint: '#a67c52',
        modelType: 'nightstand'
      },
      f_plant: {
        id: 'f_plant',
        catalogId: 'monstera_planter',
        name: 'Potted Monstera Deliciosa',
        category: 'plants',
        position: { x: 6700, y: 5100, z: 0 },
        rotation: 45,
        dimensions: { width: 650, depth: 650, height: 1150 },
        colorTint: '#2d6a4f',
        modelType: 'plant'
      },
      f_vanity: {
        id: 'f_vanity',
        catalogId: 'vanity_sink',
        name: 'Floating Vanity & Sink',
        category: 'storage',
        position: { x: 1300, y: 700, z: 0 },
        rotation: 0,
        dimensions: { width: 1000, depth: 520, height: 850 },
        colorTint: '#f1f5f9',
        modelType: 'vanity'
      },
      f_tub: {
        id: 'f_tub',
        catalogId: 'bathtub_freestanding',
        name: 'Freestanding Soaking Tub',
        category: 'decor',
        position: { x: 1300, y: 1700, z: 0 },
        rotation: 0,
        dimensions: { width: 1650, depth: 800, height: 600 },
        colorTint: '#ffffff',
        modelType: 'bathtub'
      }
    },
    structures: {},
    blueprintUnderlay: null,
    selection: { type: 'none', id: null },
    activeTool: 'select',
    viewMode: '2d_main',
    pipVisible: true
  };
}

export function createTwoBedroomSuiteTemplate(): ProjectState {
  return {
    version: '1.0.0',
    id: 'template_2bed_02',
    name: 'Luxury 2-Bedroom Suite',
    settings: {
      wallHeight: 3000,
      wallThickness: 200,
      slabThickness: 150,
      gridSizeMm: 100,
      snapAngleDeg: 45,
      measurementUnit: 'mm',
      floorOpacity: 1.0,
      autoCutawayWall: true
    },
    nodes: {
      n1: { id: 'n1', x: 0, y: 0 },
      n2: { id: 'n2', x: 10000, y: 0 },
      n3: { id: 'n3', x: 10000, y: 7000 },
      n4: { id: 'n4', x: 0, y: 7000 },

      // Partition dividers
      n_mid_top: { id: 'n_mid_top', x: 5000, y: 0 },
      n_mid_mid: { id: 'n_mid_mid', x: 5000, y: 4000 },
      n_mid_bot: { id: 'n_mid_bot', x: 5000, y: 7000 },
      n_left_mid: { id: 'n_left_mid', x: 0, y: 4000 }
    },
    walls: {
      w_top_1: { id: 'w_top_1', startNodeId: 'n1', endNodeId: 'n_mid_top', thickness: 200, height: 3000, openings: [
        { id: 'op_w1', wallId: 'w_top_1', type: 'window', offset: 2500, offsetFromStart: 2500, width: 1600, height: 1400, sillHeight: 900, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_top_2: { id: 'w_top_2', startNodeId: 'n_mid_top', endNodeId: 'n2', thickness: 200, height: 3000, openings: [
        { id: 'op_w2', wallId: 'w_top_2', type: 'window', offset: 2500, offsetFromStart: 2500, width: 2000, height: 1600, sillHeight: 700, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_right: { id: 'w_right', startNodeId: 'n2', endNodeId: 'n3', thickness: 200, height: 3000, openings: [
        { id: 'op_w3', wallId: 'w_right', type: 'bay_window', offset: 3500, offsetFromStart: 3500, width: 2600, height: 2100, sillHeight: 400, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_bot_2: { id: 'w_bot_2', startNodeId: 'n3', endNodeId: 'n_mid_bot', thickness: 200, height: 3000, openings: [
        { id: 'op_d_main', wallId: 'w_bot_2', type: 'double_door', offset: 2500, offsetFromStart: 2500, width: 1600, height: 2200, sillHeight: 0, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_bot_1: { id: 'w_bot_1', startNodeId: 'n_mid_bot', endNodeId: 'n4', thickness: 200, height: 3000, openings: [], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_left_2: { id: 'w_left_2', startNodeId: 'n4', endNodeId: 'n_left_mid', thickness: 200, height: 3000, openings: [
        { id: 'op_w4', wallId: 'w_left_2', type: 'window', offset: 2000, offsetFromStart: 2000, width: 1400, height: 1200, sillHeight: 900, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },
      w_left_1: { id: 'w_left_1', startNodeId: 'n_left_mid', endNodeId: 'n1', thickness: 200, height: 3000, openings: [
        { id: 'op_w5', wallId: 'w_left_1', type: 'window', offset: 2000, offsetFromStart: 2000, width: 1400, height: 1200, sillHeight: 900, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'granite_tile', interiorMaterial: 'white_plaster' },

      // Interior partitions
      w_div_v1: { id: 'w_div_v1', startNodeId: 'n_mid_top', endNodeId: 'n_mid_mid', thickness: 150, height: 3000, openings: [
        { id: 'op_d_bed1', wallId: 'w_div_v1', type: 'door', offset: 3000, offsetFromStart: 3000, width: 900, height: 2100, sillHeight: 0, swingSide: 1, hingeSide: 'right' }
      ], exteriorMaterial: 'white_plaster', interiorMaterial: 'white_plaster' },
      w_div_v2: { id: 'w_div_v2', startNodeId: 'n_mid_mid', endNodeId: 'n_mid_bot', thickness: 150, height: 3000, openings: [
        { id: 'op_d_bed2', wallId: 'w_div_v2', type: 'door', offset: 1500, offsetFromStart: 1500, width: 900, height: 2100, sillHeight: 0, swingSide: -1, hingeSide: 'left' }
      ], exteriorMaterial: 'white_plaster', interiorMaterial: 'white_plaster' },
      w_div_h: { id: 'w_div_h', startNodeId: 'n_left_mid', endNodeId: 'n_mid_mid', thickness: 150, height: 3000, openings: [], exteriorMaterial: 'white_plaster', interiorMaterial: 'white_plaster' }
    },
    rooms: {},
    furniture: {
      f_bed1: {
        id: 'f_bed1',
        catalogId: 'bed_king_deluxe',
        name: 'Primary King Bed',
        category: 'beds',
        position: { x: 2500, y: 1500, z: 0 },
        rotation: 0,
        dimensions: { width: 1950, depth: 2150, height: 1050 },
        colorTint: '#e2e8f0',
        modelType: 'bed'
      },
      f_bed2: {
        id: 'f_bed2',
        catalogId: 'bed_king_deluxe',
        name: 'Guest Queen Bed',
        category: 'beds',
        position: { x: 2500, y: 5500, z: 0 },
        rotation: 0,
        dimensions: { width: 1700, depth: 2100, height: 950 },
        colorTint: '#dfdcd7',
        modelType: 'bed'
      },
      f_sofa_main: {
        id: 'f_sofa_main',
        catalogId: 'sofa_3seater',
        name: 'Living Room Sofa',
        category: 'seating',
        position: { x: 7500, y: 4800, z: 0 },
        rotation: 0,
        dimensions: { width: 2200, depth: 950, height: 820 },
        colorTint: '#3f4e5f',
        modelType: 'sofa'
      },
      f_dining: {
        id: 'f_dining',
        catalogId: 'dining_set_6p',
        name: 'Dining Table & 4 Chairs',
        category: 'tables',
        position: { x: 7500, y: 2200, z: 0 },
        rotation: 0,
        dimensions: { width: 1600, depth: 900, height: 760 },
        colorTint: '#8c5830',
        modelType: 'dining_set'
      }
    },
    structures: {},
    blueprintUnderlay: null,
    selection: { type: 'none', id: null },
    activeTool: 'select',
    viewMode: '2d_main',
    pipVisible: true
  };
}

export function createBlankCanvasTemplate(): ProjectState {
  return {
    version: '1.0.0',
    id: 'template_blank',
    name: 'New Custom Floorplan',
    settings: {
      wallHeight: 2800,
      wallThickness: 200,
      slabThickness: 150,
      gridSizeMm: 100,
      snapAngleDeg: 45,
      measurementUnit: 'mm',
      floorOpacity: 1.0,
      autoCutawayWall: true
    },
    nodes: {},
    walls: {},
    rooms: {},
    structures: {},
    furniture: {},
    blueprintUnderlay: null,
    selection: { type: 'none', id: null },
    activeTool: 'draw_wall',
    viewMode: '2d_main',
    pipVisible: true
  };
}

export function createCoohomCurvedShowcaseTemplate(): ProjectState {
  // Arc sampling: Center at (1786, 7128), R = 7349, theta from 2.895 to -2.895
  const arcPoints: { x: number; y: number }[] = [];
  const numArcSteps = 24;
  const startAng = Math.PI - 0.246; // ~2.895
  const endAng = -Math.PI + 0.246;  // ~-2.895
  const R = 7349;
  const cx = 1786;
  const cy = 7128.5;

  for (let i = 0; i <= numArcSteps; i++) {
    const t = i / numArcSteps;
    const ang = startAng + t * (endAng - startAng);
    arcPoints.push({
      x: Math.round(cx + R * Math.cos(ang)),
      y: Math.round(cy + R * Math.sin(ang))
    });
  }

  // Room polygon: straight chord from (0, 14257) up to (0, 0), then along arc back to (0, 14257)
  const curvedRoomPoints = [
    { x: 0, y: 14257 },
    { x: 0, y: 0 },
    ...arcPoints
  ];

  return {
    version: '1.0.0',
    id: 'template_coohom_curved',
    name: 'Curved Penthouse Suite',
    settings: {
      wallHeight: 2800,
      wallThickness: 240,
      slabThickness: 120,
      gridSizeMm: 100,
      snapAngleDeg: 45,
      measurementUnit: 'mm',
      floorOpacity: 1.0,
      autoCutawayWall: true
    },
    nodes: {
      n_tl: { id: 'n_tl', x: 0, y: 0, cornerStyle: 'fillet', filletRadiusMm: 350 },
      n_tr: { id: 'n_tr', x: 11709, y: 0, cornerStyle: 'fillet', filletRadiusMm: 350 },
      n_p1_l: { id: 'n_p1_l', x: 0, y: 2700 },
      n_p1_r: { id: 'n_p1_r', x: 11709, y: 2700 },
      n_p2_l: { id: 'n_p2_l', x: 0, y: 5400 },
      n_p2_r: { id: 'n_p2_r', x: 11709, y: 5400 },
      n_bl: { id: 'n_bl', x: 0, y: 14257, cornerStyle: 'fillet', filletRadiusMm: 350 },
      n_br: { id: 'n_br', x: 11709, y: 14257, cornerStyle: 'fillet', filletRadiusMm: 350 }
    },
    walls: {
      // 1. Arc Wall on the left (Coohom signature arc)
      w_arc: {
        id: 'w_arc',
        startNodeId: 'n_tl',
        endNodeId: 'n_bl',
        thickness: 240,
        height: 2800,
        isCurved: true,
        arcSagitta: -5563,
        arcRadius: 7349,
        arcCenter: { x: 1786, y: 7128.5 },
        arcStartAngle: 2.895,
        arcEndAngle: -2.895,
        openings: [
          {
            id: 'op_arc_d1',
            wallId: 'w_arc',
            type: 'door',
            offset: 2200,
            offsetFromStart: 2200,
            width: 900,
            height: 2100,
            sillHeight: 0,
            swingSide: 1,
            hingeSide: 'right'
          },
          {
            id: 'op_arc_win',
            wallId: 'w_arc',
            type: 'window',
            offset: 7100,
            offsetFromStart: 7100,
            width: 1800,
            height: 1400,
            sillHeight: 800,
            swingSide: 1,
            hingeSide: 'right'
          },
          {
            id: 'op_arc_d2',
            wallId: 'w_arc',
            type: 'door',
            offset: 12200,
            offsetFromStart: 12200,
            width: 900,
            height: 2100,
            sillHeight: 0,
            swingSide: 1,
            hingeSide: 'left'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },

      // 2. Straight Center Spine Wall (Dividing curved room & rectangular wing)
      w_div_v: {
        id: 'w_div_v',
        startNodeId: 'n_tl',
        endNodeId: 'n_bl',
        thickness: 240,
        height: 2800,
        openings: [
          {
            id: 'op_spine_d1',
            wallId: 'w_div_v',
            type: 'double_door',
            offset: 7128,
            offsetFromStart: 7128,
            width: 1600,
            height: 2200,
            sillHeight: 0,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },

      // 3. Rectangular suites boundary & partition walls (Width 11709mm)
      w_top: {
        id: 'w_top',
        startNodeId: 'n_tl',
        endNodeId: 'n_tr',
        thickness: 240,
        height: 2800,
        openings: [
          {
            id: 'op_top_win',
            wallId: 'w_top',
            type: 'window',
            offset: 5850,
            offsetFromStart: 5850,
            width: 2000,
            height: 1500,
            sillHeight: 700,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_right_1: {
        id: 'w_right_1',
        startNodeId: 'n_tr',
        endNodeId: 'n_p1_r',
        thickness: 240,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_right_2: {
        id: 'w_right_2',
        startNodeId: 'n_p1_r',
        endNodeId: 'n_p2_r',
        thickness: 240,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_right_3: {
        id: 'w_right_3',
        startNodeId: 'n_p2_r',
        endNodeId: 'n_br',
        thickness: 240,
        height: 2800,
        openings: [
          {
            id: 'op_side_bay',
            wallId: 'w_right_3',
            type: 'bay_window',
            offset: 4428,
            offsetFromStart: 4428,
            width: 2400,
            height: 1800,
            sillHeight: 450,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },
      w_bottom: {
        id: 'w_bottom',
        startNodeId: 'n_bl',
        endNodeId: 'n_br',
        thickness: 240,
        height: 2800,
        openings: [],
        exteriorMaterial: 'granite_tile',
        interiorMaterial: 'white_plaster'
      },

      // Horizontal partition dividers (11709mm)
      w_part_1: {
        id: 'w_part_1',
        startNodeId: 'n_p1_l',
        endNodeId: 'n_p1_r',
        thickness: 150,
        height: 2800,
        openings: [
          {
            id: 'op_part_d1',
            wallId: 'w_part_1',
            type: 'door',
            offset: 3500,
            offsetFromStart: 3500,
            width: 900,
            height: 2100,
            sillHeight: 0,
            swingSide: 1,
            hingeSide: 'right'
          }
        ],
        exteriorMaterial: 'white_plaster',
        interiorMaterial: 'white_plaster'
      },
      w_part_2: {
        id: 'w_part_2',
        startNodeId: 'n_p2_l',
        endNodeId: 'n_p2_r',
        thickness: 150,
        height: 2800,
        openings: [
          {
            id: 'op_part_d2',
            wallId: 'w_part_2',
            type: 'door',
            offset: 8200,
            offsetFromStart: 8200,
            width: 900,
            height: 2100,
            sillHeight: 0,
            swingSide: -1,
            hingeSide: 'left'
          }
        ],
        exteriorMaterial: 'white_plaster',
        interiorMaterial: 'white_plaster'
      }
    },
    rooms: {
      room_curved_unnamed: {
        id: 'room_curved_unnamed',
        name: 'Unnamed',
        nodeIds: ['n_tl', 'n_bl'],
        points: curvedRoomPoints,
        areaSquareMeters: 180.59,
        perimeterMeters: 48.2,
        floorMaterial: 'marble',
        ceilingMaterial: 'plaster_white'
      },
      room_suite_1: {
        id: 'room_suite_1',
        name: 'Master Suite',
        nodeIds: ['n_tl', 'n_tr', 'n_p1_r', 'n_p1_l'],
        points: [
          { x: 0, y: 0 },
          { x: 11709, y: 0 },
          { x: 11709, y: 2700 },
          { x: 0, y: 2700 }
        ],
        areaSquareMeters: 31.61,
        perimeterMeters: 28.8,
        floorMaterial: 'oak_parquet',
        ceilingMaterial: 'plaster_white'
      },
      room_suite_2: {
        id: 'room_suite_2',
        name: 'Guest Bedroom',
        nodeIds: ['n_p1_l', 'n_p1_r', 'n_p2_r', 'n_p2_l'],
        points: [
          { x: 0, y: 2700 },
          { x: 11709, y: 2700 },
          { x: 11709, y: 5400 },
          { x: 0, y: 5400 }
        ],
        areaSquareMeters: 31.61,
        perimeterMeters: 28.8,
        floorMaterial: 'oak_parquet',
        ceilingMaterial: 'plaster_white'
      },
      room_suite_3: {
        id: 'room_suite_3',
        name: 'Living & Dining Hall',
        nodeIds: ['n_p2_l', 'n_p2_r', 'n_br', 'n_bl'],
        points: [
          { x: 0, y: 5400 },
          { x: 11709, y: 5400 },
          { x: 11709, y: 14257 },
          { x: 0, y: 14257 }
        ],
        areaSquareMeters: 103.71,
        perimeterMeters: 41.1,
        floorMaterial: 'oak_parquet',
        ceilingMaterial: 'plaster_white'
      }
    },
    structures: {},
    furniture: {
      f_penthouse_sofa: {
        id: 'f_penthouse_sofa',
        catalogId: 'sofa_sectional_l',
        name: 'Modern Sectional Sofa',
        category: 'seating',
        position: { x: 5800, y: 9800, z: 0 },
        rotation: 0,
        dimensions: { width: 3200, depth: 2200, height: 850 },
        colorTint: '#334155',
        modelType: 'sofa'
      },
      f_penthouse_dining: {
        id: 'f_penthouse_dining',
        catalogId: 'dining_set_6p',
        name: 'Grand Dining Set',
        category: 'tables',
        position: { x: 8500, y: 7200, z: 0 },
        rotation: 90,
        dimensions: { width: 2200, depth: 1000, height: 760 },
        colorTint: '#1e293b',
        modelType: 'dining_set'
      },
      f_penthouse_bed: {
        id: 'f_penthouse_bed',
        catalogId: 'bed_king_deluxe',
        name: 'Master Suite King Bed',
        category: 'beds',
        position: { x: 5850, y: 1350, z: 0 },
        rotation: 0,
        dimensions: { width: 2000, depth: 2200, height: 1100 },
        colorTint: '#cbd5e1',
        modelType: 'bed'
      }
    },
    blueprintUnderlay: null,
    selection: { type: 'room', id: 'room_curved_unnamed' },
    activeTool: 'select',
    viewMode: '2d_main',
    pipVisible: true
  };
}
