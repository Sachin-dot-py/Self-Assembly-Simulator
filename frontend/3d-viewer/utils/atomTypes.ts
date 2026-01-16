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
  { shortname: "H", fullname: "hydrogen", radius: 1.2, color: hexToRgb("#CCCCCC") },
  { shortname: "He", fullname: "helium", radius: 1.4, color: hexToRgb("#D9FFFF") },
  { shortname: "Li", fullname: "lithium", radius: 1.82, color: hexToRgb("#CC80FF") },
  { shortname: "Be", fullname: "beryllium", radius: 1.53, color: hexToRgb("#C2FF00") },
  { shortname: "B", fullname: "boron", radius: 1.92, color: hexToRgb("#FFB5B5") },
  { shortname: "C", fullname: "carbon", radius: 1.7, color: hexToRgb("#808080") },
  { shortname: "N", fullname: "nitrogen", radius: 1.55, color: hexToRgb("#3050F8") },
  { shortname: "O", fullname: "oxygen", radius: 1.52, color: hexToRgb("#AA0000") },
  { shortname: "F", fullname: "fluorine", radius: 1.35, color: hexToRgb("#90E050") },
  { shortname: "Ne", fullname: "neon", radius: 1.54, color: hexToRgb("#3050F8") },
  { shortname: "Na", fullname: "sodium", radius: 2.27, color: hexToRgb("#AB5CF2") },
  { shortname: "Mg", fullname: "magnesium", radius: 1.73, color: hexToRgb("#8AFF00") },
  { shortname: "Al", fullname: "aluminium", radius: 1.84, color: hexToRgb("#BFA6A6") },
  { shortname: "Si", fullname: "silicon", radius: 2.27, color: hexToRgb("#F0C8A0") },
  { shortname: "P", fullname: "phosphorus", radius: 1.8, color: hexToRgb("#FF8000") },
  { shortname: "S", fullname: "sulfur", radius: 1.8, color: hexToRgb("#FFFF30") },
  { shortname: "Cl", fullname: "chlorine", radius: 1.75, color: hexToRgb("#1FF01F") },
  { shortname: "Ar", fullname: "argon", radius: 1.88, color: hexToRgb("#80D1E3") },
];

/**
 * Additional colors for atom types beyond the default list
 * Used cyclically for higher type indices
 */
export const extendedColors: { r: number; g: number; b: number }[] = [
  hexToRgb("#FF6666"), // Red
  hexToRgb("#6666FF"), // Blue
  hexToRgb("#66FF66"), // Green
  hexToRgb("#FFFF66"), // Yellow
  hexToRgb("#FF66FF"), // Magenta
  hexToRgb("#66FFFF"), // Cyan
  hexToRgb("#FFA500"), // Orange
  hexToRgb("#800080"), // Purple
  hexToRgb("#008080"), // Teal
  hexToRgb("#FFC0CB"), // Pink
];

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
