# Self-Assembly Trajectory Viewer

A React component for visualizing LAMMPS trajectory files (.lammpstrj) with interactive 3D visualization.

## Quick Test (Current Vite Project)

1. **Swap the entry point:**
   ```bash
   cd /Users/sachin/Documents/Coding/Atomify/atomify
   mv src/index.tsx src/index.original.tsx
   mv src/index.demo.tsx src/index.tsx
   ```

2. **Run the dev server:**
   ```bash
   npm run start
   ```

3. **Visit:** http://localhost:5173

4. **Restore original when done:**
   ```bash
   mv src/index.tsx src/index.demo.tsx
   mv src/index.original.tsx src/index.tsx
   ```

## Usage in Next.js

### 1. Copy the component folder

Copy the entire `self-assembly/` folder to your Next.js project root.

### 2. Install dependencies

```bash
npm install zustand omovi three styled-components antd @ant-design/icons
npm install -D @types/three @types/styled-components
```

### 3. Create a page

Create `app/simulation/page.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const TrajectoryViewer = dynamic(
  () => import("@/self-assembly").then((mod) => mod.TrajectoryViewer),
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
```

### 4. Place your trajectory file

Put your `.lammpstrj` file in `public/data/master.lammpstrj`

### 5. Run

```bash
npm run dev
```

Visit: http://localhost:3000/simulation

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `trajectoryContent` | `string` | required | Raw `.lammpstrj` file content |
| `height` | `string` | `"100vh"` | Component height |
| `width` | `string` | `"100%"` | Component width |
| `autoPlay` | `boolean` | `false` | Auto-start playback |
| `showControls` | `boolean` | `true` | Show playback controls |
| `showSimulationBox` | `boolean` | `true` | Show wireframe box |
| `particleRadius` | `number` | `0.4` | Atom size scale |

## Keyboard Shortcuts

- **Space**: Play/Pause
- **Left Arrow**: Previous frame
- **Right Arrow**: Next frame
- **Home**: Go to first frame
- **End**: Go to last frame

## File Structure

```
self-assembly/
├── index.ts                # Main exports
├── TrajectoryViewer.tsx    # Main component
├── components/
│   ├── VisualizerCanvas.tsx
│   └── PlaybackControls.tsx
├── parsers/
│   ├── types.ts
│   └── lammpstrjParser.ts
├── store/
│   └── trajectoryStore.ts
├── utils/
│   ├── atomTypes.ts
│   └── boxGeometry.ts
└── demo/
    ├── DemoPage.tsx
    └── nextjs-page.tsx
```
