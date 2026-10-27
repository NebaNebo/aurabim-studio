import { FurnitureCategory } from '../core/types';

export interface CatalogItemDefinition {
  id: string;
  name: string;
  category: FurnitureCategory;
  dimensions: { width: number; depth: number; height: number }; // mm
  colorTint: string;
  modelType: string;
  icon: string;
  description: string;
}

export const FURNITURE_CATALOG: CatalogItemDefinition[] = [
  // Living Room
  {
    id: 'sofa_3seater',
    name: 'Nordic 3-Seater Sofa',
    category: 'seating',
    dimensions: { width: 2200, depth: 950, height: 820 },
    colorTint: '#3f4e5f',
    modelType: 'sofa',
    icon: '🛋️',
    description: 'Minimalist Scandinavian upholstered sofa with solid oak tapered legs.'
  },
  {
    id: 'armchair_lounge',
    name: 'Modern Lounge Armchair',
    category: 'seating',
    dimensions: { width: 900, depth: 850, height: 800 },
    colorTint: '#9a7b56',
    modelType: 'armchair',
    icon: '🪑',
    description: 'Deep-seat accent armchair with curved ergonomic armrests.'
  },
  {
    id: 'coffee_table_round',
    name: 'Round Oak Coffee Table',
    category: 'tables',
    dimensions: { width: 900, depth: 900, height: 420 },
    colorTint: '#b58855',
    modelType: 'table',
    icon: '☕',
    description: 'Low circular coffee table with natural solid oak grain.'
  },
  {
    id: 'tv_console_media',
    name: 'Media Console & TV',
    category: 'storage',
    dimensions: { width: 1900, depth: 450, height: 1200 },
    colorTint: '#1e293b',
    modelType: 'storage',
    icon: '📺',
    description: 'Low-profile media unit with thin-bezel 65-inch OLED display.'
  },
  {
    id: 'floor_lamp_arc',
    name: 'Arc Floor Lamp',
    category: 'lighting',
    dimensions: { width: 600, depth: 900, height: 1900 },
    colorTint: '#d4af37',
    modelType: 'lamp',
    icon: '💡',
    description: 'Brass finished cantilevered curved standing lamp.'
  },

  // Bedroom
  {
    id: 'bed_king_deluxe',
    name: 'King Bed & Headboard',
    category: 'beds',
    dimensions: { width: 1950, depth: 2150, height: 1050 },
    colorTint: '#e2e8f0',
    modelType: 'bed',
    icon: '🛏️',
    description: 'Plush upholstered king-sized bed with double pillows and oak base.'
  },
  {
    id: 'nightstand_modern',
    name: 'Oak Nightstand',
    category: 'tables',
    dimensions: { width: 500, depth: 450, height: 500 },
    colorTint: '#a67c52',
    modelType: 'nightstand',
    icon: '🗄️',
    description: 'Compact bedside table with drawer and reading lamp.'
  },
  {
    id: 'wardrobe_closet',
    name: '3-Door Armoire Wardrobe',
    category: 'storage',
    dimensions: { width: 1800, depth: 620, height: 2200 },
    colorTint: '#334155',
    modelType: 'wardrobe',
    icon: '🚪',
    description: 'Full-height architectural wardrobe with matte veneer finish.'
  },

  // Dining & Kitchen
  {
    id: 'dining_set_6p',
    name: 'Dining Table & 4 Chairs',
    category: 'tables',
    dimensions: { width: 1600, depth: 900, height: 760 },
    colorTint: '#8c5830',
    modelType: 'dining_set',
    icon: '🍽️',
    description: 'Rectangular dining table surrounded by 4 matching padded chairs.'
  },
  {
    id: 'kitchen_island',
    name: 'Kitchen Island Bar',
    category: 'tables',
    dimensions: { width: 1800, depth: 850, height: 920 },
    colorTint: '#f8fafc',
    modelType: 'kitchen_island',
    icon: '🍳',
    description: 'Waterfall quartz countertop island with 2 bar stools.'
  },

  // Office
  {
    id: 'desk_executive',
    name: 'Work Desk & Chair',
    category: 'tables',
    dimensions: { width: 1400, depth: 700, height: 750 },
    colorTint: '#2b3442',
    modelType: 'desk',
    icon: '💻',
    description: 'Modern writing desk with ergonomic mesh task chair and laptop.'
  },
  {
    id: 'bookshelf_tall',
    name: 'Modular Bookshelf',
    category: 'storage',
    dimensions: { width: 1100, depth: 350, height: 1850 },
    colorTint: '#475569',
    modelType: 'bookshelf',
    icon: '📚',
    description: 'Open-shelf display bookcase with varied cubby dividers.'
  },

  // Bathroom
  {
    id: 'vanity_sink',
    name: 'Floating Vanity & Sink',
    category: 'storage',
    dimensions: { width: 1000, depth: 520, height: 850 },
    colorTint: '#f1f5f9',
    modelType: 'vanity',
    icon: '🚰',
    description: 'Wall-hung vanity with ceramic vessel basin and chrome faucet.'
  },
  {
    id: 'bathtub_freestanding',
    name: 'Freestanding Soaking Tub',
    category: 'decor',
    dimensions: { width: 1650, depth: 800, height: 600 },
    colorTint: '#ffffff',
    modelType: 'bathtub',
    icon: '🛁',
    description: 'Deep oval acrylic soaking bathtub with floor-mounted mixer.'
  },

  // Decor & Plants
  {
    id: 'monstera_planter',
    name: 'Potted Monstera Deliciosa',
    category: 'plants',
    dimensions: { width: 650, depth: 650, height: 1150 },
    colorTint: '#2d6a4f',
    modelType: 'plant',
    icon: '🪴',
    description: 'Lush tropical potted indoor houseplant in ceramic planter.'
  },
  {
    id: 'area_rug_large',
    name: 'Geometric Area Rug',
    category: 'decor',
    dimensions: { width: 2400, depth: 1600, height: 15 },
    colorTint: '#cbd5e1',
    modelType: 'rug',
    icon: '🧶',
    description: 'Plush low-pile woven area rug with subtle geometric pattern.'
  }
];
