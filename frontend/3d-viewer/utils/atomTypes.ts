/**
 * Default atom type definitions with colors and radii
 * Based on CPK coloring convention
 */

import type { AtomTypeInfo } from "../parsers/types";

/**
 * Convert hex color string to RGB object
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 128, g: 128, b: 128 }; // Default gray
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Default atom types with CPK colors
 * Index corresponds to LAMMPS atom type (1-indexed in files, but we use 0-indexed arrays)
 */
export const defaultAtomTypes: AtomTypeInfo[] = [
  { shortname: "H", fullname: "hydrogen", radius: 1.2, color: hexToRgb("#e5e7eb") },
  { shortname: "He", fullname: "helium", radius: 1.4, color: hexToRgb("#a78bfa") },
  { shortname: "Li", fullname: "lithium", radius: 1.82, color: hexToRgb("#f472b6") },
  { shortname: "Be", fullname: "beryllium", radius: 1.53, color: hexToRgb("#34d399") },
  { shortname: "B", fullname: "boron", radius: 1.92, color: hexToRgb("#84cc16") },
  { shortname: "C", fullname: "carbon", radius: 1.7, color: hexToRgb("#9ca3af") },
  { shortname: "N", fullname: "nitrogen", radius: 1.55, color: hexToRgb("#1d4ed8") },
  { shortname: "O", fullname: "oxygen", radius: 1.52, color: hexToRgb("#ef4444") },
  { shortname: "F", fullname: "fluorine", radius: 1.35, color: hexToRgb("#06b6d4") },
  { shortname: "Ne", fullname: "neon", radius: 1.54, color: hexToRgb("#7c3aed") },
  { shortname: "Na", fullname: "sodium", radius: 2.27, color: hexToRgb("#2563eb") },
  { shortname: "Mg", fullname: "magnesium", radius: 1.73, color: hexToRgb("#14b8a6") },
  { shortname: "Al", fullname: "aluminium", radius: 1.84, color: hexToRgb("#f59e0b") },
  { shortname: "Si", fullname: "silicon", radius: 2.27, color: hexToRgb("#f97316") },
  { shortname: "P", fullname: "phosphorus", radius: 1.8, color: hexToRgb("#fb923c") },
  { shortname: "S", fullname: "sulfur", radius: 1.8, color: hexToRgb("#facc15") },
  { shortname: "Cl", fullname: "chlorine", radius: 1.75, color: hexToRgb("#16a34a") },
  { shortname: "Ar", fullname: "argon", radius: 1.88, color: hexToRgb("#38bdf8") },
];

/**
 * Additional colors for atom types beyond the default list
 * Used cyclically for higher type indices
 */
export const extendedColors: { r: number; g: number; b: number }[] = [
  hexToRgb("#ef4444"), // vivid red
  hexToRgb("#2563eb"), // vivid blue
  hexToRgb("#16a34a"), // vivid green
  hexToRgb("#facc15"), // vivid yellow
  hexToRgb("#a855f7"), // vivid purple
  hexToRgb("#06b6d4"), // vivid cyan
  hexToRgb("#f97316"), // vivid orange
  hexToRgb("#0ea5e9"), // sky
  hexToRgb("#10b981"), // emerald
  hexToRgb("#f472b6"), // pink
];

/**
 * Map of element shortname (uppercase) to RGB color for reuse in UI legends.
 */
export const atomColorsBySymbol: Record<string, { r: number; g: number; b: number }> = Object.fromEntries(
  defaultAtomTypes.map((atom) => [atom.shortname.toUpperCase(), atom.color])
);

/**
 * Get RGB color by element shortname (case-insensitive). Returns undefined if unknown.
 */
export function getAtomColorBySymbol(symbol: string): { r: number; g: number; b: number } | undefined {
  if (!symbol) return undefined;
  return atomColorsBySymbol[symbol.toUpperCase()];
}

/**
 * Convert RGB object to css rgb() string for inline styling.
 */
export function rgbToCss(color: { r: number; g: number; b: number }): string {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Get atom type info for a given type index
 * Falls back to extended colors for types beyond the default list
 */
export function getAtomTypeInfo(typeIndex: number): AtomTypeInfo {
  // LAMMPS types are 1-indexed, convert to 0-indexed
  const idx = typeIndex - 1;

  if (idx >= 0 && idx < defaultAtomTypes.length) {
    return defaultAtomTypes[idx];
  }

  // For types beyond the default list, use extended colors cyclically
  const colorIdx = idx % extendedColors.length;
  return {
    shortname: `T${typeIndex}`,
    fullname: `Type ${typeIndex}`,
    radius: 1.5,
    color: extendedColors[colorIdx],
  };
}

export default defaultAtomTypes;
