/**
 * Simulation box geometry utilities
 * Adapted from Atomify for standalone use
 */

import * as THREE from "three";
import type { SimulationBox } from "../parsers/types";

// Constants for box geometry rendering
const RADIUS_SCALE_FACTOR = 0.0015;
const MIN_RADIUS = 0.1;
const CYLINDER_RADIAL_SEGMENTS = 8;
const ZERO_LENGTH_THRESHOLD = 1e-4;
const MIN_NORMALIZED_LENGTH = 0.001;

/**
 * Convert LAMMPS box bounds to a Matrix3 and origin Vector3
 */
export function boxToMatrix(box: SimulationBox): {
  cellMatrix: THREE.Matrix3;
  origin: THREE.Vector3;
} {
  const lx = box.xhi - box.xlo;
  const ly = box.yhi - box.ylo;
  const lz = box.zhi - box.zlo;

  const xy = box.xy ?? 0;
  const xz = box.xz ?? 0;
  const yz = box.yz ?? 0;

  // LAMMPS cell matrix convention (row vectors)
  const cellMatrix = new THREE.Matrix3().set(lx, 0, 0, xy, ly, 0, xz, yz, lz);

  const origin = new THREE.Vector3(box.xlo, box.ylo, box.zlo);

  return { cellMatrix, origin };
}

/**
 * Extracts the three basis vectors from a LAMMPS cell matrix.
 * LAMMPS stores vectors as rows, but extractBasis gets columns, so we transpose first.
 */
export function extractBasisVectors(cellMatrix: THREE.Matrix3): {
  a: THREE.Vector3;
  b: THREE.Vector3;
  c: THREE.Vector3;
} {
  // LAMMPS stores vectors as rows, but extractBasis gets columns - transpose first
  const transposed = cellMatrix.clone().transpose();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  transposed.extractBasis(a, b, c);

  return { a, b, c };
}

/**
 * Calculates an appropriate radius for box wireframe edges based on the cell matrix.
 * Uses RADIUS_SCALE_FACTOR of the average basis vector length, with a minimum of MIN_RADIUS.
 */
export function calculateBoxRadius(cellMatrix: THREE.Matrix3): number {
  const { a, b, c } = extractBasisVectors(cellMatrix);

  const avgLength = (a.length() + b.length() + c.length()) / 3;
  return Math.max(avgLength * RADIUS_SCALE_FACTOR, MIN_RADIUS);
}

/**
 * Creates a Group of cylinders for a parallelepiped wireframe from a cell matrix and origin.
 * Handles both orthogonal and triclinic (non-orthogonal) simulation boxes.
 * Uses cylinders instead of lines to ensure proper thickness across all systems.
 */
export function createBoxGeometry(
  cellMatrix: THREE.Matrix3,
  origin: THREE.Vector3,
  radius: number = MIN_RADIUS
): THREE.Group {
  // Extract basis vectors using shared helper function
  const { a, b, c } = extractBasisVectors(cellMatrix);

  // Compute the 8 vertices of the parallelepiped
  const vertices: THREE.Vector3[] = [
    origin.clone(), // v0
    origin.clone().add(a), // v1
    origin.clone().add(b), // v2
    origin.clone().add(c), // v3
    origin.clone().add(a).add(b), // v4
    origin.clone().add(a).add(c), // v5
    origin.clone().add(b).add(c), // v6
    origin.clone().add(a).add(b).add(c), // v7
  ];

  // Define the 12 edges of the parallelepiped
  const edges = [
    // Bottom face (z = 0 plane)
    [0, 1], // v0 -> v1
    [1, 4], // v1 -> v4
    [4, 2], // v4 -> v2
    [2, 0], // v2 -> v0
    // Top face (z = c plane)
    [3, 5], // v3 -> v5
    [5, 7], // v5 -> v7
    [7, 6], // v7 -> v6
    [6, 3], // v6 -> v3
    // Vertical edges connecting bottom to top
    [0, 3], // v0 -> v3
    [1, 5], // v1 -> v5
    [4, 7], // v4 -> v7
    [2, 6], // v2 -> v6
  ];

  const group = new THREE.Group();

  // Create material once and reuse for all edges
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });

  // Create a cylinder for each edge
  edges.forEach(([i, j]) => {
    const start = vertices[i];
    const end = vertices[j];
    const direction = new THREE.Vector3().subVectors(end, start);
    const length = direction.length();

    if (length < ZERO_LENGTH_THRESHOLD) {
      // Skip zero-length edges
      return;
    }

    // Create cylinder geometry (default orientation is along Y-axis)
    const geometry = new THREE.CylinderGeometry(
      radius,
      radius,
      length,
      CYLINDER_RADIAL_SEGMENTS
    );

    // Create mesh
    const cylinder = new THREE.Mesh(geometry, material);

    // Position at midpoint
    const midpoint = new THREE.Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5);
    cylinder.position.copy(midpoint);

    // Orient cylinder along the edge direction
    const targetAxis = direction.clone().normalize();

    // Validate targetAxis is valid
    if (
      !isFinite(targetAxis.x) ||
      !isFinite(targetAxis.y) ||
      !isFinite(targetAxis.z) ||
      targetAxis.length() < MIN_NORMALIZED_LENGTH
    ) {
      // Invalid direction, skip this edge
      geometry.dispose();
      return;
    }

    // Align cylinder to edge direction
    cylinder.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      targetAxis
    );

    // Validate final quaternion
    if (
      !isFinite(cylinder.quaternion.x) ||
      !isFinite(cylinder.quaternion.y) ||
      !isFinite(cylinder.quaternion.z) ||
      !isFinite(cylinder.quaternion.w)
    ) {
      // Last resort: identity quaternion
      cylinder.quaternion.set(0, 0, 0, 1);
    }

    group.add(cylinder);
  });

  return group;
}

/**
 * Calculates the axis-aligned bounding box (AABB) of a simulation box parallelepiped.
 */
export function getSimulationBoxBounds(
  cellMatrix: THREE.Matrix3,
  origin: THREE.Vector3
): THREE.Box3 {
  const { a, b, c } = extractBasisVectors(cellMatrix);

  const vertices: THREE.Vector3[] = [
    origin.clone(),
    origin.clone().add(a),
    origin.clone().add(b),
    origin.clone().add(c),
    origin.clone().add(a).add(b),
    origin.clone().add(a).add(c),
    origin.clone().add(b).add(c),
    origin.clone().add(a).add(b).add(c),
  ];

  return new THREE.Box3().setFromPoints(vertices);
}
