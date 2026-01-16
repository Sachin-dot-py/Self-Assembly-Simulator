"use client";

/**
 * 3D visualization canvas using omovi library
 * Renders atoms and simulation box
 */

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import styled from "styled-components";
import { useTrajectoryStore } from "../store/trajectoryStore";
import { getAtomTypeInfo } from "../utils/atomTypes";
import {
  boxToMatrix,
  calculateBoxRadius,
  createBoxGeometry,
} from "../utils/boxGeometry";

// Dynamic imports for omovi (client-side only)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Visualizer: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Particles: any = null;

const CanvasWrapper = styled.div`
  width: 100%;
  height: 100%;
  position: relative;
  background: #1a1a2e;
`;

interface VisualizerCanvasProps {
  particleRadius?: number;
}

export default function VisualizerCanvas({
  particleRadius = 0.4,
}: VisualizerCanvasProps) {
  const domRef = useRef<HTMLDivElement>(null);
  const boxGroupRef = useRef<THREE.Group | null>(null);
  const [omoviLoaded, setOmoviLoaded] = useState(false);

  const {
    trajectory,
    currentFrame,
    visualizer,
    particles,
    showSimulationBox,
    setVisualizer,
    setParticles,
  } = useTrajectoryStore();

  // Initialize visualizer function
  const initializeVisualizer = useCallback(() => {
    if (!domRef.current || !Visualizer || visualizer) return;

    console.log("Initializing visualizer...");
    const newVisualizer = new Visualizer({
      domElement: domRef.current,
    });

    // Initialize post-processing
    newVisualizer.initPostProcessing({
      ssao: {
        enabled: true,
        radius: 10,
        intensity: 5,
      },
    });

    // Set lighting
    newVisualizer.pointLight.intensity = 20.0;
    newVisualizer.ambientLight.intensity = 0.05;

    setVisualizer(newVisualizer);
    console.log("Visualizer initialized");
  }, [visualizer, setVisualizer]);

  // Load omovi dynamically (client-side only)
  useEffect(() => {
    if (omoviLoaded) return;

    console.log("Loading omovi...");
    import("omovi").then((omovi) => {
      Visualizer = omovi.Visualizer;
      Particles = omovi.Particles;
      setOmoviLoaded(true);
      console.log("Omovi loaded");
    }).catch((err) => {
      console.error("Failed to load omovi:", err);
    });
  }, [omoviLoaded]);

  // Initialize visualizer when omovi is loaded and DOM is ready
  useEffect(() => {
    if (omoviLoaded && domRef.current && !visualizer) {
      initializeVisualizer();
    }
  }, [omoviLoaded, initializeVisualizer, visualizer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (visualizer) {
        visualizer.dispose();
        setVisualizer(null);
      }
    };
  }, []);

  // Create particles when trajectory loads
  useEffect(() => {
    if (!visualizer || !trajectory || !Particles) return;

    const numAtoms = trajectory.atomCount;

    // Remove old particles
    if (particles) {
      visualizer.remove(particles);
    }

    // Create new particles object
    const newParticles = new Particles(numAtoms);
    newParticles.count = numAtoms;

    // Add to visualizer
    visualizer.add(newParticles);
    setParticles(newParticles);

    // Cleanup
    return () => {
      if (visualizer && newParticles) {
        visualizer.remove(newParticles);
      }
    };
  }, [visualizer, trajectory?.totalFrames]);

  // Update particle positions when frame changes
  useEffect(() => {
    if (!visualizer || !particles || !trajectory) return;

    const frame = trajectory.frames[currentFrame];
    if (!frame) return;

    // Update positions
    particles.positions.set(frame.atoms.positions);
    particles.types.set(frame.atoms.types);
    particles.indices.set(frame.atoms.ids);
    particles.count = frame.numAtoms;

    if (particles.mesh) {
      particles.mesh.count = frame.numAtoms;
    }

    particles.markNeedsUpdate();

    // Apply colors and radii based on atom types
    for (let i = 0; i < frame.numAtoms; i++) {
      const realIndex = frame.atoms.ids[i];
      const type = frame.atoms.types[i];
      const atomType = getAtomTypeInfo(type);

      const radius = particleRadius * atomType.radius;
      visualizer.setRadius(realIndex, radius);
      visualizer.setColor(realIndex, atomType.color);
    }
  }, [currentFrame, trajectory, visualizer, particles, particleRadius]);

  // Update simulation box
  useEffect(() => {
    if (!visualizer || !trajectory) return;

    // Remove old box
    if (boxGroupRef.current) {
      visualizer.scene.remove(boxGroupRef.current);
      boxGroupRef.current = null;
    }

    if (!showSimulationBox) return;

    const frame = trajectory.frames[currentFrame];
    if (!frame) return;

    const { cellMatrix, origin } = boxToMatrix(frame.box);
    const radius = calculateBoxRadius(cellMatrix);
    const boxGroup = createBoxGeometry(cellMatrix, origin, radius);

    boxGroupRef.current = boxGroup;
    visualizer.scene.add(boxGroup);

    return () => {
      if (boxGroupRef.current && visualizer) {
        visualizer.scene.remove(boxGroupRef.current);
        boxGroupRef.current = null;
      }
    };
  }, [visualizer, trajectory, currentFrame, showSimulationBox]);

  return <CanvasWrapper ref={domRef} />;
}
