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

    // Set up the VDW representation similar to:
    //   mol representation VDW
    //   mol color Name
    model.setStyle({}, {
      sphere: {
        radius: 0.5, // Adjust radius to approximate VDW radii
        colorscheme: 'Jmol'
      }
    });

    // If the file provides unit cell (PBC) info, add a periodic box.
    // This emulates:
    //   pbc box
    //   pbcbox_update -molid top -style lines -width 3 -rectangular -color white
    if(model.getUnitCell) {
      const unitCell = model.getUnitCell();
      if(unitCell) {
        viewerRef.current.addUnitCell({
          cell: unitCell,
          style: 'line',
          linewidth: 3,
          color: 'white',
          rectangular: true
        });
      }
    }

    // Reset view (like display resetview) and adjust container size (display resize 620 400)
    viewerRef.current.zoomTo();
    // containerRef.current.style.width = '620px';
    // containerRef.current.style.height = '400px';

    // Start animation (emulating animate goto 1 and animate forward)
    // viewerRef.current.animate({ loop: "forward" });
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