/**
 * Parser for XYZ trajectory files
 *
 * Supports both standard XYZ and extended XYZ (extxyz/ASE) formats.
 *
 * Standard XYZ format (per frame):
 * <number of atoms>
 * <comment line>
 * <element> <x> <y> <z>
 * ...
 *
 * Extended XYZ format (per frame):
 * <number of atoms>
 * Lattice="ax ay az bx by bz cx cy cz" Properties=species:S:1:pos:R:3:... other_key=value
 * <element> <x> <y> <z> [additional columns based on Properties]
 * ...
 */

import type { Trajectory, TrajectoryFrame, SimulationBox } from "./types";

// Map element symbols to numeric type indices
const elementToType: Map<string, number> = new Map();
let nextTypeIndex = 1;

function getTypeForElement(element: string): number {
  const normalized = element.trim().toLowerCase();
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);

  if (!elementToType.has(capitalized)) {
    elementToType.set(capitalized, nextTypeIndex++);
  }
  return elementToType.get(capitalized)!;
}

/**
 * Parse lattice from extended XYZ comment line
 * Format: Lattice="ax ay az bx by bz cx cy cz"
 */
function parseLattice(commentLine: string): SimulationBox | null {
  const latticeMatch = commentLine.match(/Lattice="([^"]+)"/);
  if (!latticeMatch) return null;

  const values = latticeMatch[1].trim().split(/\s+/).map(Number);
  if (values.length !== 9 || values.some(isNaN)) return null;

  // Lattice vectors: a = [0,1,2], b = [3,4,5], c = [6,7,8]
  const [ax, _ay, _az, bx, by, _bz, cx, cy, cz] = values;

  // For orthorhombic boxes (common case), the box is axis-aligned
  // For triclinic, we need to handle tilt factors

  // Calculate box bounds assuming origin at 0
  // For a general triclinic box, we compute the bounding box
  const xlo = 0;
  const ylo = 0;
  const zlo = 0;

  // The box lengths along each axis
  const xhi = ax;
  const yhi = by;
  const zhi = cz;

  // Tilt factors for triclinic boxes
  const xy = bx;
  const xz = cx;
  const yz = cy;

  return {
    xlo, xhi,
    ylo, yhi,
    zlo, zhi,
    xy: Math.abs(xy) > 1e-10 ? xy : undefined,
    xz: Math.abs(xz) > 1e-10 ? xz : undefined,
    yz: Math.abs(yz) > 1e-10 ? yz : undefined,
  };
}

/**
 * Parse Properties string to find column indices
 * Format: Properties=species:S:1:pos:R:3:momenta:R:3:forces:R:3
 */
function parseProperties(commentLine: string): { posStart: number; numCols: number } {
  const propsMatch = commentLine.match(/Properties=([^\s]+)/);
  if (!propsMatch) {
    // Default: element at 0, positions at 1-3
    return { posStart: 1, numCols: 4 };
  }

  const props = propsMatch[1].split(":");
  let colIndex = 0;
  let posStart = 1;
  let numCols = 0;

  for (let i = 0; i < props.length; i += 3) {
    const name = props[i];
    // props[i + 1] is type: S=string, R=real, I=integer (unused)
    const count = parseInt(props[i + 2], 10) || 1;

    if (name === "species" || name === "element" || name === "symbol") {
      colIndex += count;
    } else if (name === "pos" || name === "positions") {
      posStart = colIndex;
      colIndex += count;
    } else {
      colIndex += count;
    }
    numCols = colIndex;
  }

  return { posStart, numCols };
}

/**
 * Parse a complete XYZ trajectory file
 */
export function parseXyz(content: string): Trajectory {
  // Reset element mapping for each parse
  elementToType.clear();
  nextTypeIndex = 1;

  const frames: TrajectoryFrame[] = [];
  const lines = content.split("\n");
  let i = 0;
  let timestep = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line === "") {
      i++;
      continue;
    }

    // Try to parse as number of atoms
    const numAtoms = parseInt(line, 10);
    if (!isNaN(numAtoms) && numAtoms > 0) {
      const result = parseFrame(lines, i, numAtoms, timestep);
      if (result) {
        frames.push(result.frame);
        i = result.nextIndex;
        timestep++;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }

  if (frames.length === 0) {
    return {
      frames: [],
      totalFrames: 0,
      atomCount: 0,
      timestepRange: [0, 0],
    };
  }

  return {
    frames,
    totalFrames: frames.length,
    atomCount: frames[0].numAtoms,
    timestepRange: [0, frames.length - 1],
  };
}

/**
 * Parse a single frame starting at the given line index
 */
function parseFrame(
  lines: string[],
  startIndex: number,
  numAtoms: number,
  timestep: number
): { frame: TrajectoryFrame; nextIndex: number } | null {
  let i = startIndex;

  try {
    // Line 1: Number of atoms (already parsed)
    i++;

    // Line 2: Comment line (may contain Lattice, Properties, timestep info)
    const commentLine = lines[i++] || "";

    // Try to extract timestep from comment if present
    let extractedTimestep = timestep;
    const timestepMatch = commentLine.match(
      /(?:timestep|step|t)\s*[=:]*\s*(\d+)/i
    );
    if (timestepMatch) {
      extractedTimestep = parseInt(timestepMatch[1], 10);
    }

    // Parse lattice from extended XYZ format
    const latticeBox = parseLattice(commentLine);

    // Parse properties to find position column indices
    const { posStart } = parseProperties(commentLine);

    // Parse atom lines
    const ids = new Int32Array(numAtoms);
    const types = new Int32Array(numAtoms);
    const positions = new Float32Array(numAtoms * 3);

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (let a = 0; a < numAtoms; a++) {
      const atomLine = lines[i++];
      if (!atomLine) return null;

      const parts = atomLine.trim().split(/\s+/);
      if (parts.length < posStart + 3) return null;

      const element = parts[0];
      const x = parseFloat(parts[posStart]);
      const y = parseFloat(parts[posStart + 1]);
      const z = parseFloat(parts[posStart + 2]);

      if (isNaN(x) || isNaN(y) || isNaN(z)) return null;

      ids[a] = a + 1; // 1-indexed IDs
      types[a] = getTypeForElement(element);
      positions[a * 3] = x;
      positions[a * 3 + 1] = y;
      positions[a * 3 + 2] = z;

      // Track bounding box (for fallback if no Lattice)
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }

    // Use lattice box if available, otherwise create bounding box
    let box: SimulationBox;
    if (latticeBox) {
      box = latticeBox;
    } else {
      const padding = 2.0;
      box = {
        xlo: minX - padding,
        xhi: maxX + padding,
        ylo: minY - padding,
        yhi: maxY + padding,
        zlo: minZ - padding,
        zhi: maxZ + padding,
      };
    }

    return {
      frame: {
        timestep: extractedTimestep,
        numAtoms,
        box,
        atoms: { ids, types, positions },
      },
      nextIndex: i,
    };
  } catch {
    return null;
  }
}

export default parseXyz;
