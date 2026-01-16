/**
 * LAMMPS trajectory data types for the self-assembly viewer
 */

/**
 * Simulation box bounds from LAMMPS
 * Supports both orthogonal and triclinic boxes
 */
export interface SimulationBox {
  xlo: number;
  xhi: number;
  ylo: number;
  yhi: number;
  zlo: number;
  zhi: number;
  // Triclinic tilt factors (optional)
  xy?: number;
  xz?: number;
  yz?: number;
}

/**
 * Atom data for a single frame
 * Uses typed arrays for performance
 */
export interface AtomData {
  ids: Int32Array;
  types: Int32Array;
  positions: Float32Array; // Flattened [x1,y1,z1,x2,y2,z2,...]
}

/**
 * A single frame/timestep from the trajectory
 */
export interface TrajectoryFrame {
  timestep: number;
  numAtoms: number;
  box: SimulationBox;
  atoms: AtomData;
}

/**
 * Complete parsed trajectory
 */
export interface Trajectory {
  frames: TrajectoryFrame[];
  totalFrames: number;
  atomCount: number; // Assumes constant across frames
  timestepRange: [number, number];
}

/**
 * Atom type visual properties
 */
export interface AtomTypeInfo {
  shortname: string;
  fullname: string;
  radius: number;
  color: { r: number; g: number; b: number };
}
