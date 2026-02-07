"use client";

/**
 * 3D visualization canvas using omovi library
 * Renders atoms and simulation box
 */

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import styled from "styled-components";
import { useTrajectoryStore } from "../store/trajectoryStore";
import { getAtomTypeInfo, getAtomColorBySymbol } from "../utils/atomTypes";
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
  topologyContent?: string; // Optional topology (BGF/PDB-like) to map atom IDs to symbols for accurate colors
}

export default function VisualizerCanvas({
  particleRadius = 0.4,
  topologyContent,
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

  // Cache atomId -> element symbol if topology provided
  const atomIdToSymbol = useMemo(() => {
    if (!topologyContent) {
      console.warn("VisualizerCanvas: No topology content provided");
      return new Map<number, string>();
    }
    const map = new Map<number, string>();
    const lines = topologyContent.split("\n");

    for (const line of lines) {
      if (!line.startsWith("HETATM") && !line.startsWith("ATOM  ")) continue;
      const tokens = line.trim().split(/\s+/);
      if (tokens.length < 3) continue;

      const id = parseInt(tokens[1], 10);
      if (!Number.isFinite(id)) continue;

      // Normalize symbol: drop digits/charges (Na+, Cl-, Au1, etc.) and limit to 2 letters
      const raw = tokens[2] || "";
      let symbol = raw.replace(/[^A-Za-z]/g, "").slice(0, 2);
      symbol = symbol.charAt(0).toUpperCase() + symbol.slice(1).toLowerCase();
      map.set(id, symbol);
    }

    console.log("VisualizerCanvas: Parsed topology, atomId -> symbol map:", Object.fromEntries(map));
    return map;
  }, [topologyContent]);

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
        enabled: false,
        radius: 10,
        intensity: 0,
      },
    });

    // Bright, even lighting
    newVisualizer.pointLight.intensity = 0.0;
    newVisualizer.ambientLight.intensity = 1.2;

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

  // Helper to apply frame data (positions, colors, radii) to particles
  const applyFrameData = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (p: any, vis: any, frame: { numAtoms: number; atoms: { ids: Int32Array; types: Int32Array; positions: Float32Array } }) => {
      p.positions.set(frame.atoms.positions);
      p.types.set(frame.atoms.types);
      p.indices.set(frame.atoms.ids);
      p.count = frame.numAtoms;

      if (p.mesh) {
        p.mesh.count = frame.numAtoms;
      }

      p.markNeedsUpdate();

      // Prefer per-atom coloring if topology mapping available; otherwise color per type
      // Build type -> color using topology mapping when available
      const seenTypes = new Set<number>();
      for (let i = 0; i < frame.numAtoms; i++) {
        const type = frame.atoms.types[i];
        if (seenTypes.has(type)) continue;
        seenTypes.add(type);

        const atomId = frame.atoms.ids[i];
        const symbol = atomIdToSymbol.get(atomId);
        const typeInfo = getAtomTypeInfo(type);
        const color = symbol ? getAtomColorBySymbol(symbol) ?? typeInfo.color : typeInfo.color;

        vis.setRadius(type, particleRadius * typeInfo.radius);
        vis.setColor(type, color);
      }
    },
    [particleRadius, atomIdToSymbol]
  );

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

    // Get first frame to set up particles
    const firstFrame = trajectory.frames[0];
    if (firstFrame) {
      console.log("VisualizerCanvas: Setting up", firstFrame.numAtoms, "particles using array-based approach");

      // Set arrays directly (like omovi file parsers do)
      newParticles.positions.set(firstFrame.atoms.positions);
      newParticles.types.set(firstFrame.atoms.types);
      newParticles.indices.set(firstFrame.atoms.ids);
      newParticles.count = firstFrame.numAtoms;

      console.log("VisualizerCanvas: Arrays set, count =", newParticles.count);
    }

    // Add to visualizer BEFORE setting colors/radii
    visualizer.add(newParticles);
    console.log("VisualizerCanvas: Particles added to visualizer");

    // Now set colors and radii via visualizer methods (updates colorTexture/radiusTexture)
    if (firstFrame) {
      const typeColorMap = new Map<number, any>();
      for (let i = 0; i < firstFrame.numAtoms; i++) {
        const type = firstFrame.atoms.types[i];
        if (!typeColorMap.has(type)) {
          const atomId = firstFrame.atoms.ids[i];
          const symbol = atomIdToSymbol.get(atomId);
          const atomType = getAtomTypeInfo(type);
          const color = symbol ? getAtomColorBySymbol(symbol) ?? atomType.color : atomType.color;
          typeColorMap.set(type, { color, radius: particleRadius * atomType.radius, symbol });
        }
      }

      console.log("VisualizerCanvas: Setting colors and radii for", typeColorMap.size, "types");
      typeColorMap.forEach(({ color, radius, symbol }, type) => {
        visualizer.setColor(type, color);
        visualizer.setRadius(type, radius);
        console.log(`  Type ${type} (${symbol || 'unknown'}): color=`, color, `radius=${radius}`);
      });

      console.log("VisualizerCanvas: Colors and radii set via visualizer methods");
    }

    setParticles(newParticles);

    // Cleanup
    return () => {
      if (visualizer && newParticles) {
        visualizer.remove(newParticles);
      }
    };
  }, [visualizer, trajectory?.totalFrames, atomIdToSymbol, particleRadius]);

  // Update particle positions when frame changes
  useEffect(() => {
    if (!visualizer || !particles || !trajectory) return;

    const frame = trajectory.frames[currentFrame];
    if (!frame) return;

    applyFrameData(particles, visualizer, frame);
  }, [currentFrame, trajectory, visualizer, particles, particleRadius, applyFrameData]);

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
