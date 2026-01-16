/**
 * Standalone demo entry point
 *
 * To test:
 * 1. Temporarily replace src/main.tsx content with:
 *
 *    import "./index.css";
 *    import { createRoot } from "react-dom/client";
 *    import DemoPage from "../self-assembly/demo/DemoPage";
 *
 *    createRoot(document.getElementById("root")!).render(<DemoPage />);
 *
 * 2. Copy master.lammpstrj to public/self-assembly/master.lammpstrj
 * 3. Run: npm run start
 * 4. Visit: http://localhost:5173
 */

export { default as DemoPage } from "./DemoPage";
