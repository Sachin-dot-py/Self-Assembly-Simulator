'use client';

import { useState } from 'react';
import { Form, Button, Container } from 'react-bootstrap';
import Navigation from '../components/Navigation';
import styles from './page.module.css';

export default function SurfactantForm() {
    const [surfactant, setSurfactant] = useState('');
    const [ratio, setRatio] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        // Handle the form submission, send data to backend or visualize
        console.log(`Surfactant: ${surfactant}, Ratio: ${ratio}`);
    };

    const handleSurfactantChange = (e) => {
        setSurfactant(e.target.value);
    };

    const handleRatioChange = (e) => {
        setRatio(e.target.value);
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

                    <Button
                        variant="primary"
                        type="submit"
                        className={styles.visualizeButton}
                    >
                        Visualize
                    </Button>
                </Form>
            </Container>
        </>
    );
}
