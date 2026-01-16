/**
 * Parser for LAMMPS trajectory dump files (.lammpstrj)
 *
 * Handles the standard LAMMPS dump format:
 * ITEM: TIMESTEP
 * <timestep>
 * ITEM: NUMBER OF ATOMS
 * <num_atoms>
 * ITEM: BOX BOUNDS ...
 * <xlo> <xhi> [xy]
 * <ylo> <yhi> [xz]
 * <zlo> <zhi> [yz]
 * ITEM: ATOMS <columns...>
 * <atom data...>
 */

import type { Trajectory, TrajectoryFrame, SimulationBox, AtomData } from "./types";

interface ColumnIndices {
  id: number;
  type: number;
  x: number;
  y: number;
  z: number;
}

interface ParsedFrame {
  frame: TrajectoryFrame;
  nextIndex: number;
}

/**
 * Parse a complete LAMMPS trajectory file
 */
export function parseLammpstrj(content: string): Trajectory {
  const frames: TrajectoryFrame[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (line === "ITEM: TIMESTEP") {
      const result = parseFrame(lines, i);
      if (result) {
        frames.push(result.frame);
        i = result.nextIndex;
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
    timestepRange: [frames[0].timestep, frames[frames.length - 1].timestep],
  };
}

/**
 * Parse a single frame starting at the given line index
 */
function parseFrame(lines: string[], startIndex: number): ParsedFrame | null {
  let i = startIndex;

  try {
    // Skip "ITEM: TIMESTEP"
    i++;

    // Parse timestep
    const timestep = parseInt(lines[i++].trim(), 10);
    if (isNaN(timestep)) return null;

    // Skip "ITEM: NUMBER OF ATOMS"
    const numAtomsHeader = lines[i++].trim();
    if (!numAtomsHeader.includes("NUMBER OF ATOMS")) return null;

    // Parse number of atoms
    const numAtoms = parseInt(lines[i++].trim(), 10);
    if (isNaN(numAtoms) || numAtoms <= 0) return null;

    // Parse box bounds header
    const boxHeader = lines[i++].trim();
    if (!boxHeader.includes("BOX BOUNDS")) return null;

    // Determine if triclinic (header contains "xy xz yz")
    const isTriclinic = boxHeader.includes("xy");

    // Parse box bounds (3 lines)
    const box = parseBoxBounds(lines, i, isTriclinic);
    i += 3;

    // Parse atoms header to get column indices
    const atomsHeader = lines[i++].trim();
    if (!atomsHeader.includes("ITEM: ATOMS")) return null;

    const colIndices = parseColumnIndices(atomsHeader);
    if (!colIndices) return null;

    // Parse atom data
    const atoms = parseAtomData(lines, i, numAtoms, colIndices);
    i += numAtoms;

    return {
      frame: {
        timestep,
        numAtoms,
        box,
        atoms,
      },
      nextIndex: i,
    };
  } catch {
    return null;
  }
}

/**
 * Parse the box bounds from 3 lines
 */
function parseBoxBounds(
  lines: string[],
  startIndex: number,
  isTriclinic: boolean
): SimulationBox {
  const line1 = lines[startIndex].trim().split(/\s+/).map(Number);
  const line2 = lines[startIndex + 1].trim().split(/\s+/).map(Number);
  const line3 = lines[startIndex + 2].trim().split(/\s+/).map(Number);

  const box: SimulationBox = {
    xlo: line1[0],
    xhi: line1[1],
    ylo: line2[0],
    yhi: line2[1],
    zlo: line3[0],
    zhi: line3[1],
  };

  // Add triclinic tilt factors if present
  if (isTriclinic && line1.length >= 3) {
    box.xy = line1[2];
    box.xz = line2[2];
    box.yz = line3[2];
  }

  return box;
}

/**
 * Parse the column indices from the ATOMS header line
 */
function parseColumnIndices(headerLine: string): ColumnIndices | null {
  // Remove "ITEM: ATOMS " prefix
  const columnsStr = headerLine.replace("ITEM: ATOMS", "").trim();
  const columns = columnsStr.split(/\s+/);

  // Find required columns
  const idIdx = columns.indexOf("id");
  const typeIdx = columns.indexOf("type");

  // Position can be x/y/z, xs/ys/zs (scaled), or xu/yu/zu (unwrapped)
  let xIdx = columns.indexOf("x");
  let yIdx = columns.indexOf("y");
  let zIdx = columns.indexOf("z");

  // Try scaled coordinates
  if (xIdx === -1) xIdx = columns.indexOf("xs");
  if (yIdx === -1) yIdx = columns.indexOf("ys");
  if (zIdx === -1) zIdx = columns.indexOf("zs");

  // Try unwrapped coordinates
  if (xIdx === -1) xIdx = columns.indexOf("xu");
  if (yIdx === -1) yIdx = columns.indexOf("yu");
  if (zIdx === -1) zIdx = columns.indexOf("zu");

  // Validate all required columns exist
  if (idIdx === -1 || typeIdx === -1 || xIdx === -1 || yIdx === -1 || zIdx === -1) {
    console.error("Missing required columns in trajectory file", {
      columns,
      idIdx,
      typeIdx,
      xIdx,
      yIdx,
      zIdx,
    });
    return null;
  }

  return { id: idIdx, type: typeIdx, x: xIdx, y: yIdx, z: zIdx };
}

/**
 * Parse atom data lines into typed arrays
 */
function parseAtomData(
  lines: string[],
  startIndex: number,
  numAtoms: number,
  colIndices: ColumnIndices
): AtomData {
  const ids = new Int32Array(numAtoms);
  const types = new Int32Array(numAtoms);
  const positions = new Float32Array(numAtoms * 3);

  for (let a = 0; a < numAtoms; a++) {
    const line = lines[startIndex + a];
    if (!line) continue;

    const parts = line.trim().split(/\s+/);

    ids[a] = parseInt(parts[colIndices.id], 10);
    types[a] = parseInt(parts[colIndices.type], 10);
    positions[a * 3] = parseFloat(parts[colIndices.x]);
    positions[a * 3 + 1] = parseFloat(parts[colIndices.y]);
    positions[a * 3 + 2] = parseFloat(parts[colIndices.z]);
  }

  return { ids, types, positions };
}

export default parseLammpstrj;
