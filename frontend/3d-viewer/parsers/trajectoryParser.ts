/**
 * Unified trajectory parser with auto-detection
 * Supports: .lammpstrj (LAMMPS dump), .xyz
 */

import type { Trajectory } from "./types";
import { parseLammpstrj } from "./lammpstrjParser";
import { parseXyz } from "./xyzParser";

export type TrajectoryFormat = "lammpstrj" | "xyz" | "unknown";

/**
 * Detect trajectory format from content
 */
export function detectFormat(content: string): TrajectoryFormat {
  const lines = content.trim().split("\n");
  if (lines.length < 2) return "unknown";

  const firstLine = lines[0].trim();
  const secondLine = lines[1]?.trim() || "";

  // LAMMPS dump format starts with "ITEM: TIMESTEP"
  if (firstLine === "ITEM: TIMESTEP") {
    return "lammpstrj";
  }

  // XYZ format: first line is a number (atom count)
  // Second line is a comment, third line is "element x y z"
  const numAtoms = parseInt(firstLine, 10);
  if (!isNaN(numAtoms) && numAtoms > 0 && lines.length >= numAtoms + 2) {
    // Check if line 3 looks like "element x y z"
    const atomLine = lines[2]?.trim() || "";
    const parts = atomLine.split(/\s+/);
    if (parts.length >= 4) {
      const element = parts[0];
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);

      // Element should be 1-2 characters, coordinates should be numbers
      if (
        element.length <= 2 &&
        /^[A-Za-z]+$/.test(element) &&
        !isNaN(x) &&
        !isNaN(y) &&
        !isNaN(z)
      ) {
        return "xyz";
      }
    }
  }

  return "unknown";
}

/**
 * Parse trajectory with auto-format detection
 */
export function parseTrajectory(
  content: string,
  format?: TrajectoryFormat
): Trajectory {
  const detectedFormat = format || detectFormat(content);

  console.log(`Detected trajectory format: ${detectedFormat}`);

  switch (detectedFormat) {
    case "lammpstrj":
      return parseLammpstrj(content);
    case "xyz":
      return parseXyz(content);
    default:
      // Try LAMMPS first, then XYZ
      const lammpsTraj = parseLammpstrj(content);
      if (lammpsTraj.totalFrames > 0) {
        return lammpsTraj;
      }
      const xyzTraj = parseXyz(content);
      if (xyzTraj.totalFrames > 0) {
        return xyzTraj;
      }
      throw new Error(
        "Unable to parse trajectory. Supported formats: LAMMPS dump (.lammpstrj), XYZ (.xyz)"
      );
  }
}

export default parseTrajectory;
