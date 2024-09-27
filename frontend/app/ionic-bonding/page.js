"use client";

import 'ketcher-react/dist/index.css';
import './page.module.css';
import { useEffect, useState } from 'react';
import LoadingButton from './LoadingBtn';
import Navigation from '../components/Navigation';
import dynamic from "next/dynamic";
// import StructureEditor from './StructureEditor';

export default function EditorPage() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // Ensure this code runs only on the client
    setIsClient(true);
  }, []);

  if (!isClient || typeof window === 'undefined') {
    return <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>Loading...</div>;
  }

  const StructureEditor = dynamic(() =>
    import("./StructureEditor"), {   ssr: false });

  return (
    <>
      <Navigation />
      <StructureEditor />
      <LoadingButton>Visualize Self-Assembly</LoadingButton>
    </>
  );
}
