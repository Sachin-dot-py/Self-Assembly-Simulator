"use client";

/**
 * Main trajectory viewer component
 * Displays LAMMPS trajectory files with interactive 3D visualization
 */

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import VisualizerCanvas from "./components/VisualizerCanvas";
import PlaybackControls from "./components/PlaybackControls";
import { useTrajectoryStore } from "./store/trajectoryStore";
import { parseTrajectory } from "./parsers/trajectoryParser";

const ViewerContainer = styled.div<{ $height: string; $width: string }>`
  height: ${(props) => props.$height};
  width: ${(props) => props.$width};
  position: relative;
  overflow: hidden;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  color: white;
  font-size: 18px;
`;

const ErrorOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1a1a2e;
  color: #ff6b6b;
  font-size: 16px;
  padding: 20px;
  text-align: center;
`;

const InfoOverlay = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  z-index: 50;
`;

export interface TrajectoryViewerProps {
  /** Raw .lammpstrj file content */
  trajectoryContent: string;
  /** Component height (default: "100vh") */
  height?: string;
  /** Component width (default: "100%") */
  width?: string;
  /** Auto-start playback (default: false) */
  autoPlay?: boolean;
  /** Show playback controls (default: true) */
  showControls?: boolean;
  /** Show simulation box wireframe (default: true) */
  showSimulationBox?: boolean;
  /** Particle radius scale factor (default: 0.4) */
  particleRadius?: number;
  /** Callback when frame changes (frame, totalFrames, progress 0-100) */
  onFrameChange?: (frame: number, totalFrames: number, progress: number) => void;
}

export default function TrajectoryViewer({
  trajectoryContent,
  height = "100vh",
  width = "100%",
  autoPlay = false,
  showControls = true,
  showSimulationBox = true,
  particleRadius = 0.4,
  onFrameChange,
}: TrajectoryViewerProps) {
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [parseError, setParseError] = useState<string | null>(null);

  const {
    trajectory,
    currentFrame,
    isPlaying,
    playbackSpeed,
    setTrajectory,
    nextFrame,
    play,
    setShowSimulationBox,
    reset,
  } = useTrajectoryStore();

  // Parse trajectory when content changes
  useEffect(() => {
    if (!trajectoryContent || trajectoryContent.trim() === "") {
      setParseError(null);
      return;
    }

    try {
      console.log("Parsing trajectory...");
      const parsed = parseTrajectory(trajectoryContent);
      console.log("Parsed frames:", parsed.totalFrames);
      if (parsed.totalFrames === 0) {
        setParseError("No valid frames found in trajectory file");
        return;
      }
      setParseError(null);
      setTrajectory(parsed);
    } catch (err) {
      console.error("Parse error:", err);
      setParseError(`Failed to parse trajectory: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [trajectoryContent, setTrajectory]);

  // Set simulation box visibility
  useEffect(() => {
    setShowSimulationBox(showSimulationBox);
  }, [showSimulationBox, setShowSimulationBox]);

  // Notify parent of frame changes
  useEffect(() => {
    if (onFrameChange && trajectory) {
      const progress = (currentFrame / Math.max(1, trajectory.totalFrames - 1)) * 100;
      onFrameChange(currentFrame, trajectory.totalFrames, progress);
    }
  }, [currentFrame, trajectory, onFrameChange]);

  // Auto-play on load
  useEffect(() => {
    if (autoPlay && trajectory && trajectory.totalFrames > 1) {
      play();
    }
  }, [autoPlay, trajectory, play]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying || !trajectory) return;

    const interval = 1000 / playbackSpeed;

    const animate = (currentTime: number) => {
      if (currentTime - lastTimeRef.current >= interval) {
        nextFrame();
        lastTimeRef.current = currentTime;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, trajectory, nextFrame]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      reset();
    };
  }, [reset]);

  // Show loading state
  if (!trajectoryContent || trajectoryContent.trim() === "") {
    return (
      <ViewerContainer $height={height} $width={width}>
        <LoadingOverlay>Waiting for trajectory data...</LoadingOverlay>
      </ViewerContainer>
    );
  }

  // Show error state
  if (parseError) {
    return (
      <ViewerContainer $height={height} $width={width}>
        <ErrorOverlay>{parseError}</ErrorOverlay>
      </ViewerContainer>
    );
  }

  // Show loading while parsing
  if (!trajectory) {
    return (
      <ViewerContainer $height={height} $width={width}>
        <LoadingOverlay>Loading trajectory...</LoadingOverlay>
      </ViewerContainer>
    );
  }

  return (
    <ViewerContainer $height={height} $width={width}>
      <VisualizerCanvas particleRadius={particleRadius} />

      <InfoOverlay>
        Atoms: {trajectory.atomCount} | Frames: {trajectory.totalFrames}
      </InfoOverlay>

      {showControls && <PlaybackControls />}
    </ViewerContainer>
  );
}
