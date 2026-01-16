/**
 * Zustand store for trajectory viewer state management
 */

import { create } from "zustand";
import type { Trajectory } from "../parsers/types";
// Note: Visualizer and Particles types are imported dynamically to avoid SSR issues

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Visualizer = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Particles = any;

interface TrajectoryStore {
  // Trajectory data
  trajectory: Trajectory | null;
  setTrajectory: (trajectory: Trajectory | null) => void;

  // Playback state
  currentFrame: number;
  isPlaying: boolean;
  playbackSpeed: number; // frames per second
  loop: boolean;

  // Playback actions
  play: () => void;
  pause: () => void;
  togglePlayback: () => void;
  setFrame: (frame: number) => void;
  nextFrame: () => void;
  prevFrame: () => void;
  setPlaybackSpeed: (fps: number) => void;
  setLoop: (loop: boolean) => void;

  // Render state
  visualizer: Visualizer | null;
  particles: Particles | null;
  showSimulationBox: boolean;

  // Render actions
  setVisualizer: (visualizer: Visualizer | null) => void;
  setParticles: (particles: Particles | null) => void;
  setShowSimulationBox: (show: boolean) => void;

  // Reset
  reset: () => void;
}

export const useTrajectoryStore = create<TrajectoryStore>((set, get) => ({
  // Initial trajectory state
  trajectory: null,
  setTrajectory: (trajectory) => set({ trajectory, currentFrame: 0 }),

  // Initial playback state
  currentFrame: 0,
  isPlaying: false,
  playbackSpeed: 30,
  loop: true,

  // Playback actions
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setFrame: (frame) => {
    const { trajectory } = get();
    if (!trajectory) return;

    const clampedFrame = Math.max(
      0,
      Math.min(frame, trajectory.totalFrames - 1)
    );
    set({ currentFrame: clampedFrame });
  },

  nextFrame: () => {
    const { trajectory, currentFrame, loop } = get();
    if (!trajectory) return;

    const totalFrames = trajectory.totalFrames;
    if (currentFrame >= totalFrames - 1) {
      if (loop) {
        set({ currentFrame: 0 });
      } else {
        set({ isPlaying: false });
      }
    } else {
      set({ currentFrame: currentFrame + 1 });
    }
  },

  prevFrame: () => {
    const { trajectory, currentFrame, loop } = get();
    if (!trajectory) return;

    const totalFrames = trajectory.totalFrames;
    if (currentFrame <= 0) {
      if (loop) {
        set({ currentFrame: totalFrames - 1 });
      }
    } else {
      set({ currentFrame: currentFrame - 1 });
    }
  },

  setPlaybackSpeed: (fps) =>
    set({ playbackSpeed: Math.max(1, Math.min(60, fps)) }),

  setLoop: (loop) => set({ loop }),

  // Initial render state
  visualizer: null,
  particles: null,
  showSimulationBox: true,

  // Render actions
  setVisualizer: (visualizer) => set({ visualizer }),
  setParticles: (particles) => set({ particles }),
  setShowSimulationBox: (show) => set({ showSimulationBox: show }),

  // Reset all state
  reset: () =>
    set({
      trajectory: null,
      currentFrame: 0,
      isPlaying: false,
      visualizer: null,
      particles: null,
    }),
}));

export default useTrajectoryStore;
