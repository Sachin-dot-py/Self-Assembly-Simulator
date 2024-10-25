'use client';

import { useEffect, useState } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import Navigation from '../components/Navigation';
import VideoVisual from '../components/VideoVisual';
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
    const [error, setError] = useState(null);

    const visualId = `${surfactant}/${ratio}`;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getfiles/' + visualId);
                const data = await response.json();
                setLog(data.log);
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Error fetching data');
            }
        };

        fetchData();
    }, [visualId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        // Show the visualization content
        setShowVisualization(true);
    };

    const handleSurfactantChange = (e) => {
        setSurfactant(e.target.value);
        if (e.target.value === 'NONE') {
            setRatio('0.0');
        } else {
            setRatio('');
        }
    };

    const handleRatioChange = (e) => {
        setRatio(e.target.value);
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
                    Select the surfactant you want to add to the water and its concentration
                    relative to the molarity of Gold. This is used in the process of simulating the
                    Self-Assembly of the Gold nanoparticles.
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
                                Explanation for Surfactant: {surfactant} <br />
                                Ratio: {ratio}
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={5} variableName="Total Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={1} variableName="Temperature" variableUnit="K" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={7} variableName="Bond Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={8} variableName="Angle Energy" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={9} variableName="Dihedral Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={10} variableName="Improper Energy" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={11} variableName="Molecular Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={12} variableName="Long-Range Energy" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={13} variableName="Tail Correction Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={2} variableName="Van der Waals Energy" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={14} variableName="Energy Coupling" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={15} variableName="Energy Conservation" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={4} variableName="Kinetic Energy" variableUnit="eV" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={3} variableName="Potential Energy" variableUnit="eV" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={2} variableName="Pressure" variableUnit="atm" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={3} variableName="Volume" variableUnit="A^3" />
                        </Col>
                    </Row>
                    <Row>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={6} variableName="Density" variableUnit="g/cm^3" />
                        </Col>
                        <Col className={styles.plotCol}>
                            <VariablePlot log={log} sliderValue={sliderValue} variableIndex={12} variableName="Enthalpy" variableUnit="eV" />
                        </Col>
                    </Row>
                </Container>
            )}
        </>
    );
}
