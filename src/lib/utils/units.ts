// ─────────────────────────────────────────────
// Unit Conversion Utilities
// ─────────────────────────────────────────────

import type { Unit } from '@/types';

/** Conversion factors → mm */
const TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  inches: 25.4,
  feet: 304.8,
};

/** Convert a value from a given unit to mm */
export function toMM(value: number, unit: Unit): number {
  return value * TO_MM[unit];
}

/** Convert a value from mm to a target unit */
export function fromMM(value: number, unit: Unit): number {
  return value / TO_MM[unit];
}

/** Convert between any two units */
export function convert(value: number, from: Unit, to: Unit): number {
  if (from === to) return value;
  const inMM = toMM(value, from);
  return fromMM(inMM, to);
}

/** Format a measurement value for display */
export function formatMeasurement(value: number, unit: Unit, decimals = 2): string {
  const unitSymbols: Record<Unit, string> = {
    mm: 'mm',
    cm: 'cm',
    inches: '"',
    feet: "'",
  };
  return `${value.toFixed(decimals)}${unitSymbols[unit]}`;
}

/** Round to a specified precision */
export function roundTo(value: number, decimals = 2): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

/** Calculate area in square mm */
export function calculateArea(width: number, height: number, unit: Unit): number {
  const wMM = toMM(width, unit);
  const hMM = toMM(height, unit);
  return wMM * hMM;
}

/** Format area for display */
export function formatArea(areaMM2: number, unit: Unit): string {
  const unitSymbols: Record<Unit, string> = {
    mm: 'mm²',
    cm: 'cm²',
    inches: 'in²',
    feet: 'ft²',
  };
  const factor = TO_MM[unit];
  const converted = areaMM2 / (factor * factor);
  return `${converted.toFixed(2)} ${unitSymbols[unit]}`;
}

/** Unit display labels */
export const UNIT_LABELS: Record<Unit, string> = {
  mm: 'Millimeters (mm)',
  cm: 'Centimeters (cm)',
  inches: 'Inches (in)',
  feet: 'Feet (ft)',
};

export const UNIT_SHORT: Record<Unit, string> = {
  mm: 'mm',
  cm: 'cm',
  inches: 'in',
  feet: 'ft',
};
