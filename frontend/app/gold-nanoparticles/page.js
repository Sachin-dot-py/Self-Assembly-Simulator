'use client';

import { useEffect, useState } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import { FaPlay } from 'react-icons/fa';
import Navigation from '../components/Navigation';
import VideoVisual from '../components/VideoVisual';
import VideoSync from '../components/VideoSync';
import VariablePlot from '../visualization/VariablePlot';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import styles from './page.module.css';

export default function SurfactantForm() {
    const [surfactant, setSurfactant] = useState('');
    const [ratio, setRatio] = useState('');
    const [showVisualization, setShowVisualization] = useState(false);
    const [sliderValue, setSliderValue] = useState(0);
    const [log, setLog] = useState('');
    const [explanationText, setExplanationText] = useState('');
    const [error, setError] = useState(null);

    const visualId = `${surfactant}/${ratio}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getfiles/' + visualId);
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                const data = await response.json();
                setLog(data.log);
                setExplanationText(data.explanationText);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Error fetching data');
            }
        };
        if (showVisualization) {
            fetchData();
        }
    }, [visualId, showVisualization]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Show the visualization content
        setShowVisualization(true);
    };

    const handleSurfactantChange = (e) => {
        setSurfactant(e.target.value);
        setShowVisualization(false); // Reset visualization state to trigger update
        if (e.target.value === 'NONE') {
            setRatio('0.0');
        } else {
            setRatio('');
        }
    };

    const handleRatioChange = (e) => {
        setRatio(e.target.value);
        setShowVisualization(false); // Reset visualization state to trigger update
    };

    const handleSliderChange = (value) => {
        setSliderValue(value); // Update sliderValue when it changes in VideoVisual
    };

    return (
        <>
            <Navigation />
            <Container className={styles.formContainer}>
                <h1 className={styles.header}>Gold Nanoparticle Self-Assembly</h1>
                <p className={styles.description}>
                This tool demonstrates the self-assembly process of gold nanoparticles (AuNPs) solvated in water and exposed to different surfactant molecules and concentrations. Gold nanoparticles are studied for their unique optical, electronic, and catalytic properties, making them valuable in fields such as biomedicine, catalysis, and electronics.
<br /><br />
Surfactants, such as citric acid, are commonly used in the synthesis of gold nanoparticles to control their size and shape. These surfactant molecules attach to the surface of the nanoparticles, stabilizing them and preventing aggregation. As the surfactant concentration increases, the size of the gold nanoparticles generally decreases. In the absence of surfactants, over time, the gold in the solution tends to aggregate, eventually forming a bulk system.
<br /><br />
Below, you&apos;ll find information about how these systems evolve during the simulation. All original systems contain a 16M concentration of gold (roughly 1200 gold atoms for every 3000 water molecules). For systems containing surfactants, you can choose to add surfactant molecules at half, the same, or 50% more than the concentration of gold. Select the surfactant and its concentration, and observe the trends in the results!
                </p>
                <Form onSubmit={handleSubmit}>
                    <Form.Group controlId="formSurfactant" className={styles.formGroup}>
                        <Form.Label>Choose Surfactant</Form.Label>
                        <div className={styles.radioGroup}>
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-NONE"
                                label={<label htmlFor="surfactant-NONE">No Surfactant</label>}
                                value="NONE"
                                checked={surfactant === 'NONE'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-CA"
                                label={<label htmlFor="surfactant-CA">Citric Acid</label>}
                                value="CA"
                                checked={surfactant === 'CA'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-MPA"
                                label={<label htmlFor="surfactant-MPA">Mercaptopropionic Acid</label>}
                                value="MPA"
                                checked={surfactant === 'MPA'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-MUA"
                                label={<label htmlFor="surfactant-MUA">11-Mercaptoundecanoic Acid</label>}
                                value="MUA"
                                checked={surfactant === 'MUA'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-OCD"
                                label={<label htmlFor="surfactant-OCD">Octadecane</label>}
                                value="OCD"
                                checked={surfactant === 'OCD'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                            <Form.Check
                                type="radio"
                                name="surfactant"
                                id="surfactant-OLY"
                                label={<label htmlFor="surfactant-OLY">Oleylamine</label>}
                                value="OLY"
                                checked={surfactant === 'OLY'}
                                onChange={handleSurfactantChange}
                                className={styles.radioButton}
                            />
                        </div>
                    </Form.Group>

                    {surfactant !== 'NONE' && (
                        <Form.Group controlId="formRatio" className={styles.formGroup}>
                            <Form.Label>Choose Surfactant to Water Ratio</Form.Label>
                            <div className={styles.radioGroup}>
                                <Form.Check
                                    type="radio"
                                    name="ratio"
                                    id="ratio-0.5"
                                    label={<label htmlFor="ratio-0.5">Half the molarity of Gold (0.5)</label>}
                                    value="0.5"
                                    checked={ratio === '0.5'}
                                    onChange={handleRatioChange}
                                    className={styles.radioButton}
                                />
                                <Form.Check
                                    type="radio"
                                    name="ratio"
                                    id="ratio-1.0"
                                    label={<label htmlFor="ratio-1.0">Same molarity of Gold (1.0)</label>}
                                    value="1.0"
                                    checked={ratio === '1.0'}
                                    onChange={handleRatioChange}
                                    className={styles.radioButton}
                                />
                                <Form.Check
                                    type="radio"
                                    name="ratio"
                                    id="ratio-1.5"
                                    label={<label htmlFor="ratio-1.5">1.5x the molarity of Gold (1.5)</label>}
                                    value="1.5"
                                    checked={ratio === '1.5'}
                                    onChange={handleRatioChange}
                                    className={styles.radioButton}
                                />
                            </div>
                        </Form.Group>
                    )}

                    <Button
                        variant="primary"
                        type="submit"
                        className={styles.visualizeButton}
                        disabled={!surfactant || (surfactant !== 'NONE' && !ratio)} // Disable button until both surfactant and ratio are selected
                    >
                        Visualize
                    </Button>
                </Form>
                <center>
                <Row className="justify-content-center" style={{ marginTop: '30px' }}>
                <Col md="auto">
                    <Button href="/gold-nanoparticles-compare" variant="success" size="lg">
                        <FaPlay style={{ marginRight: '8px' }} />
                        Compare Two Surfactants Side-by-Side
                    </Button>
                </Col>
                </Row>
                </center>
            </Container>
            {showVisualization && (
                <Container className={styles.pageContainer}>
                    <h2 className={styles.visualizationHeader}>Self-Assembly Visualization</h2>
                    <Row>
                        <Col className={styles.visualizationCol}>
                            <VideoVisual visualId={visualId} onProgressChange={handleSliderChange} />
                        </Col>
                        <Col className={styles.textCol}>
                            <div className={styles.explanationText}>
                                Surfactant: {surfactant} <br />
                                Ratio: {ratio} <br />
                                {explanationText}
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.visualizationCol}>
                            <VideoSync visualId={visualId} progress={sliderValue} display={"clusters"} />
                        </Col>
                        <Col className={styles.visualizationCol}>
                            <VideoSync visualId={visualId} progress={sliderValue} display={"barplot"} />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={5} variableName="Total Energy" variableUnit="kcal/mol" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={6} variableName="Van der Waals Energy" variableUnit="kcal/mol" />
                        </Col>
                    </Row>
                </Container>
            )}
        </>
    );
}
