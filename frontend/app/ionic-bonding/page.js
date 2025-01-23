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
import { FaFlask, FaAtom, FaPlay } from 'react-icons/fa';

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
            <Card.Title>Welcome to our Ionic Bonding Simulation Tool!</Card.Title>
            <Card.Text>
            This tool demonstrates how atoms arrange themselves in materials due to the forces between them, and how changes in their environment affect these arrangements.
            <br />
            You will create a group of positively and negatively charged atoms in a virtual box. These atoms attract and repel each other based on Coulomb&apos;s law:
            <br />
            <img src="https://latex.codecogs.com/svg.image?F=\frac{k\cdotq1\cdotq2}{r^2}" title=" F=\frac{k\cdot q1\cdot q2}{r^2}" />
            <br />
            where F is the force, k is a constant, q1 and q2 are charges, and r is the distance between charges. Positive charges attract negative charges and repel other positive charges, and vice versa for negative charges.
            <br />
            Next, the system will be simulated using Molecular Dynamics software. This program simulates atoms over time according to classical physics laws. Each atom receives a random velocity based on the chosen temperature, simulating real-world disturbances beyond Coulombic forces.
            <br />
            Follow the instructions below to set up your system. Try creating an unstable structure by following the attraction and repulsion rules. See how it assembles into a more stable configuration through our optimization procedure!
            </Card.Text>
            <Card.Title>How do I use this tool?</Card.Title>
            <Card.Text>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'start', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaFlask style={{ marginRight: '0.5rem', color: '#00d1b2' }} />
                  <span>1. To create a structure, use the editor below to draw and place ions.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaAtom style={{ marginRight: '0.5rem', color: '#00d1b2' }} />
                  <span>2. Use the &quot;PT&quot; button on the right toolbar to select elements from the periodic table.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaAtom style={{ marginRight: '0.5rem', color: '#00d1b2' }} />
                  <span>3. Place the atoms in the desired positions on the canvas.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaFlask style={{ marginRight: '0.5rem', color: '#00d1b2' }} />
                  <span>4. Use the A<sup>+</sup> and A<sup>-</sup> buttons on the left toolbar to convert atoms to ions.</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <FaPlay style={{ marginRight: '0.5rem', color: '#00d1b2' }} />
                  <span>5. Once ready, click the Visualize button to run the simulation and visualize the results.</span>
                </div>
              </div>
            </Card.Text>
            <Button variant="primary" style={{ marginBottom: '1rem' }}>Watch the demo video</Button>
          </Card.Body>
        </Card>
      </center>
      <StructureEditor />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
        <div style={{ textAlign: 'center', marginTop: '2rem', padding: '2rem', backgroundColor: '#f0f0f0', borderRadius: '15px', boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', width: 'fit-content' }}>
          <LoadingButton variant="success" style={{ fontWeight: 'bold', fontSize: '2.2rem', padding: '1rem 3rem' }}>Visualize Self-Assembly</LoadingButton>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: '#6c757d' }}>
            The visualization process might take up to 1-3 minutes.
          </p>
        </div>
      </div>
      <br />
      <br />
      <br />
      <br />
    </>
  );
}
