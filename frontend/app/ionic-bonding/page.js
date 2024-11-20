"use client";

import 'ketcher-react/dist/index.css';
import './page.module.css';
import { useEffect, useState } from 'react';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
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
      <center>
        <Card bg={"dark"} text={"white"} style={{ width: '52rem' }}>
          <Card.Header as="h5">Visualizing the Self-Assembly of Ions</Card.Header>
          <Card.Body>
            <Card.Title>What does this tool do?</Card.Title>
            <Card.Text>
              This tool allows users to create chemical structures and visualize the process of self-assembly of ions.
            </Card.Text>
            <Card.Title>How do I use this tool?</Card.Title>
            <Card.Text>
              To create a structure, use the editor below to draw and place ions.
              <br />
              Use the "PT" button on the right toolbar to select elements from the periodic table.
              <br />
              Place the atoms in the desired positions on the canvas.
              <br />
              Use the A<sup>+</sup> and A<sup>-</sup> buttons on the left toolbar to convert atoms to ions.
              <br />
              Once ready, click the Visualize button to run the simulation and visualize the results.
            </Card.Text>
            <Button variant="primary" style={{ marginBottom: '1rem' }}>Watch the demo video</Button>
          </Card.Body>
        </Card>
      </center>
      <br />
      <StructureEditor />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <LoadingButton variant="success" style={{ fontWeight: 'bold', fontSize: '2.2rem', padding: '0.75rem 2rem' }}>Visualize Self-Assembly</LoadingButton>
          <p>
            <i>The visualization process might take up to 1-3 minutes.</i>
          </p>
        </div>
      </div>
    </>
  );
}
