"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const TrajectoryViewer = dynamic(
  () => import("@/3d-viewer").then((mod) => mod.TrajectoryViewer),
  { ssr: false }
);

export default function SimulationPage() {
  const [trajectory, setTrajectory] = useState("");

  useEffect(() => {
    fetch("/data/master.lammpstrj")
      .then((res) => res.text())
      .then(setTrajectory);
  }, []);

  return (
    <TrajectoryViewer
      trajectoryContent={trajectory}
      height="100vh"
      autoPlay={true}
    />
  );
}