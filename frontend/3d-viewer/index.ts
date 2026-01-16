/**
 * Self-Assembly Trajectory Viewer
 * A Next.js-compatible component for visualizing LAMMPS trajectories
 */

// Main component
export { default as TrajectoryViewer } from "./TrajectoryViewer";
export type { TrajectoryViewerProps } from "./TrajectoryViewer";

// Types
export type {
  Trajectory,
  TrajectoryFrame,
  SimulationBox,
  AtomData,
  AtomTypeInfo,
} from "./parsers/types";

// Parser (for custom usage)
export { parseLammpstrj } from "./parsers/lammpstrjParser";

// Store (for advanced usage)
export { useTrajectoryStore } from "./store/trajectoryStore";

// Default export
export { default } from "./TrajectoryViewer";
