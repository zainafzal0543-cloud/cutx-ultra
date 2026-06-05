import type { SheetPreset } from '@/types';

export const SHEET_PRESETS: SheetPreset[] = [
  // Plywood — Standard
  {
    id: 'ply-2440x1220',
    name: 'Plywood 8×4 (Standard)',
    material: 'plywood',
    width: 2440,
    height: 1220,
    thickness: 18,
    unit: 'mm',
  },
  {
    id: 'ply-2440x1220-thick',
    name: 'Plywood 8×4 (25mm)',
    material: 'plywood',
    width: 2440,
    height: 1220,
    thickness: 25,
    unit: 'mm',
  },
  {
    id: 'ply-3050x1525',
    name: 'Plywood 10×5',
    material: 'plywood',
    width: 3050,
    height: 1525,
    thickness: 18,
    unit: 'mm',
  },
  // MDF
  {
    id: 'mdf-2440x1220-18',
    name: 'MDF 8×4 (18mm)',
    material: 'mdf',
    width: 2440,
    height: 1220,
    thickness: 18,
    unit: 'mm',
  },
  {
    id: 'mdf-2440x1220-12',
    name: 'MDF 8×4 (12mm)',
    material: 'mdf',
    width: 2440,
    height: 1220,
    thickness: 12,
    unit: 'mm',
  },
  {
    id: 'mdf-2800x2070',
    name: 'MDF Jumbo 2800×2070',
    material: 'mdf',
    width: 2800,
    height: 2070,
    thickness: 18,
    unit: 'mm',
  },
  // Acrylic
  {
    id: 'acrylic-2440x1220',
    name: 'Acrylic 8×4',
    material: 'acrylic',
    width: 2440,
    height: 1220,
    thickness: 6,
    unit: 'mm',
  },
  {
    id: 'acrylic-3050x2030',
    name: 'Acrylic 10×6.7',
    material: 'acrylic',
    width: 3050,
    height: 2030,
    thickness: 3,
    unit: 'mm',
  },
  // Aluminum
  {
    id: 'alu-2440x1220',
    name: 'Aluminum Sheet 8×4',
    material: 'aluminum',
    width: 2440,
    height: 1220,
    thickness: 2,
    unit: 'mm',
  },
  {
    id: 'alu-3000x1500',
    name: 'Aluminum Sheet 3m×1.5m',
    material: 'aluminum',
    width: 3000,
    height: 1500,
    thickness: 3,
    unit: 'mm',
  },
];

export const MATERIAL_LABELS: Record<string, string> = {
  plywood: 'Plywood',
  mdf: 'MDF',
  acrylic: 'Acrylic',
  aluminum: 'Aluminum',
  steel: 'Steel',
  glass: 'Glass',
  solid_wood: 'Solid Wood',
  custom: 'Custom',
};

export const MATERIAL_COLORS: Record<string, string> = {
  plywood: '#D4A574',
  mdf: '#B8A89A',
  acrylic: '#93C5FD',
  aluminum: '#CBD5E1',
  steel: '#94A3B8',
  glass: '#BAE6FD',
  solid_wood: '#8B6914',
  custom: '#86868B',
};

export const DEFAULT_KERF_BY_MATERIAL: Record<string, number> = {
  plywood: 3.2,
  mdf: 3.2,
  acrylic: 3.0,
  aluminum: 2.5,
  steel: 2.0,
  glass: 4.0,
  solid_wood: 3.5,
  custom: 3.2,
};
