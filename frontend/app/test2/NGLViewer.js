'use client'

// import { useEffect, useRef } from "react";
// import NGL from "ngl";

// const NGLViewer = ({ trajUrl }) => {
//   const stageRef = useRef(null);

//   useEffect(() => {
//     // Create NGL stage
//     const stage = new NGL.Stage("ngl-container", { backgroundColor: "#222" });
//     stageRef.current = stage;

//     // Load LAMMPS trajectory via mdsrv
//     stage.loadFile(trajUrl, { ext: "lammpstrj", defaultRepresentation: true })
//       .then((component) => {
//         component.autoView(); // Auto adjust view
//       })
//       .catch((err) => console.error("Error loading trajectory:", err));

//     // Cleanup on unmount
//     return () => {
//       stage.dispose();
//     };
//   }, [trajUrl]);

//   return <div id="ngl-container" style={{ width: "100%", height: "500px" }}></div>;
// };

// export default NGLViewer;


'use client'

import React from 'react';
import { Stage, Component } from 'react-ngl';

const NGLViewer = ({ trajUrl }) => {
  return (
    <Stage width="100%" height="500px" backgroundColor="#222">
      <Component
        path={trajUrl}
        ext="lammpstrj"
        defaultRepresentation={true}
        onLoad={component => component.autoView()}
      />
    </Stage>
  );
};

export default NGLViewer;
