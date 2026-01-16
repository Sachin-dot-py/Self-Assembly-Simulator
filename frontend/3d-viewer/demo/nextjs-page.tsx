"use client";

/**
 * Next.js App Router page for TrajectoryViewer
 *
 * Copy this file to: app/simulation/page.tsx (or any route you prefer)
 * Copy the self-assembly folder to your Next.js project root
 *
 * Then visit: http://localhost:3000/simulation
 */

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with Three.js/WebGL
const TrajectoryViewer = dynamic(
  () => import("..").then((mod) => mod.TrajectoryViewer),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1a1a2e",
        color: "white"
      }}>
        Loading viewer...
      </div>
    )
  }
);

export default function SimulationPage() {
  const [trajectoryContent, setTrajectoryContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load trajectory from your API or static file
    loadTrajectory();
  }, []);

  const loadTrajectory = async () => {
    try {
      // Option 1: Fetch from API route
      // const response = await fetch("/api/simulation/trajectory");
      // const text = await response.text();
      // setTrajectoryContent(text);

      // Option 2: Fetch from public folder
      // Place master.lammpstrj in public/data/master.lammpstrj
      const response = await fetch("/data/master.lammpstrj");
      if (response.ok) {
        const text = await response.text();
        setTrajectoryContent(text);
      } else {
        // Fallback: use inline demo data
        setTrajectoryContent(DEMO_TRAJECTORY);
      }
    } catch (error) {
      console.error("Failed to load trajectory:", error);
      setTrajectoryContent(DEMO_TRAJECTORY);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ width: "100vw", height: "100vh", margin: 0, padding: 0 }}>
      {loading ? (
        <div style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1a2e",
          color: "white",
          fontSize: "18px"
        }}>
          Loading simulation...
        </div>
      ) : (
        <TrajectoryViewer
          trajectoryContent={trajectoryContent}
          height="100vh"
          width="100vw"
          autoPlay={false}
          showControls={true}
          showSimulationBox={true}
          particleRadius={0.5}
        />
      )}
    </main>
  );
}

// Demo trajectory data (fallback)
const DEMO_TRAJECTORY = `ITEM: TIMESTEP
0
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS pp pp ff
1.3434376800000001e+01 1.7545037199999999e+01
-8.2058172000000003e+00 -4.2876567999999997e+00
-1.7581890000000000e+00 1.7581890000000000e+00
ITEM: ATOMS id type x y z vx vy vz
1 1 14.896 -5.74931 0 0 0 0
2 2 15.611 -6.27181 0 0 0 0
ITEM: TIMESTEP
5
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS pp pp ff
1.3434376800000001e+01 1.7545037199999999e+01
-8.2058172000000003e+00 -4.2876567999999997e+00
-1.7581890000000000e+00 1.7581890000000000e+00
ITEM: ATOMS id type x y z vx vy vz
1 1 14.646 -5.56662 0 0 0 0
2 2 15.861 -6.4545 0 0 0 0
ITEM: TIMESTEP
10
ITEM: NUMBER OF ATOMS
2
ITEM: BOX BOUNDS pp pp ff
1.3434376800000001e+01 1.7545037199999999e+01
-8.2058172000000003e+00 -4.2876567999999997e+00
-1.7581890000000000e+00 1.7581890000000000e+00
ITEM: ATOMS id type x y z vx vy vz
1 1 14.218 -5.29759 0 0 0 0
2 2 16.289 -6.72353 0 0 0 0
`;
