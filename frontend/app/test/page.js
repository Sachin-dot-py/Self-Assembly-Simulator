'use client'
import React, { useEffect, useRef, useState } from 'react';

export default function ThreeDmolViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Dynamically load 3Dmol.js from the CDN
    const script = document.createElement('script');
    script.src = 'https://3Dmol.org/build/3Dmol-min.js';
    script.async = true;
    script.onload = initializeViewer;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const initializeViewer = async () => {
    // Create a 3Dmol viewer with antialias off (shadows and ambient occlusion are off by default)
    viewerRef.current = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor: 'white',
      antialias: false,
    });

    // Fetch the LAMMPS trajectory file from the backend
    const response = await fetch('/api/getfiles/lammpstrj');
    const lammpstrjText = await response.text();

    // Add the model from the trajectory file (type: lammpstrj)
    const model = viewerRef.current.addModel(lammpstrjText, "lammpstrj");

    // ----- Parse box bounds from the LAMMPS trajectory -----
    const lines = lammpstrjText.split('\n');
    let boxBounds = null;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('ITEM: BOX BOUNDS')) {
        // The next three lines contain the bounds for x, y, and z
        boxBounds = [
          lines[i + 1].trim(),
          lines[i + 2].trim(),
          lines[i + 3].trim(),
        ];
        break;
      }
    }
    // If we found the bounds, extract numerical values and draw the box outline.
    if (boxBounds) {
      const [xBounds, yBounds, zBounds] = boxBounds.map(line =>
        line.split(/\s+/).map(Number)
      );
      const [xlo, xhi] = xBounds;
      const [ylo, yhi] = yBounds;
      const [zlo, zhi] = zBounds;

      // Define the 8 vertices of the box
      const vertices = [
        { x: xlo, y: ylo, z: zlo }, // 0: bottom, front, left
        { x: xhi, y: ylo, z: zlo }, // 1: bottom, front, right
        { x: xhi, y: yhi, z: zlo }, // 2: bottom, back, right
        { x: xlo, y: yhi, z: zlo }, // 3: bottom, back, left
        { x: xlo, y: ylo, z: zhi }, // 4: top, front, left
        { x: xhi, y: ylo, z: zhi }, // 5: top, front, right
        { x: xhi, y: yhi, z: zhi }, // 6: top, back, right
        { x: xlo, y: yhi, z: zhi }, // 7: top, back, left
      ];

      // Define the 12 edges of the box (pairs of vertex indices)
      const edges = [
        [0, 1], [1, 2], [2, 3], [3, 0], // bottom face
        [4, 5], [5, 6], [6, 7], [7, 4], // top face
        [0, 4], [1, 5], [2, 6], [3, 7]  // vertical edges
      ];

      // Draw each edge as a line in the viewer
      edges.forEach(([startIndex, endIndex]) => {
        viewerRef.current.addLine({
          start: vertices[startIndex],
          end: vertices[endIndex],
          color: 'black',
          linewidth: 2,
        });
      });
    }
    // --------------------------------------------------------
    const ionColor = (element) => {
      const colors = ["red", "blue", "green", "yellow", "purple", "orange", "cyan", "magenta"];
      try{
        const atom = parseInt(element.atom);
        return colors[atom % colors.length];
      } catch (e) {
        console.error(e);
        return "gray";
      }
    };
    
    // Set up the VDW representation
    model.setStyle({}, {
      sphere: {
        radius: 0.5, // Adjust radius to approximate VDW radii,
        colorfunc: ionColor
      }
    });

    // If the file provides unit cell (PBC) info, add a periodic box (optional)
    if (model.getUnitCell) {
      const unitCell = model.getUnitCell();
      if (unitCell) {
        viewerRef.current.addUnitCell({
          cell: unitCell,
          style: 'line',
          linewidth: 3,
          color: 'white',
          rectangular: true
        });
      }
    }

    // Reset view and start animation
    viewerRef.current.zoomTo();
    viewerRef.current.animate({
      loop: "forward",
      callback: () => {
        viewerRef.current.zoomTo();
        viewerRef.current.render();
      }
    });
    viewerRef.current.render();
    setIsLoading(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>3Dmol.js Viewer for LAMMPS Trajectory</h2>
      {isLoading && <div>Loading trajectory...</div>}
      <div
        ref={containerRef}
        style={{ width: '620px', height: '400px', border: '1px solid #ccc' }}
      />
      <p>You can rotate the structure by clicking and dragging within the viewer.</p>
    </div>
  );
}