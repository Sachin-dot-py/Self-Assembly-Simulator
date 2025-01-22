'use client'

import styles from './page.module.css';
import VariablePlot from './VariablePlot';
import VideoVisual from '../components/VideoVisual';
import Container from 'react-bootstrap/Container';
import Navigation from '../components/Navigation';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

const ELEMENT_COLORS = {
    'H': 'White',
    'C': 'Cyan',
    'N': 'Blue',
    'O': 'Red',
    'S': 'Yellow',
    'P': 'Orange',
    'Fe': 'Brown',
    'Mg': 'Green',
    'Ca': 'Light Blue',
    'Zn': 'Slate',
    'Na': 'Blue',
    'Cl': 'Green',
    'Br': 'Dark Red',
    'I': 'Purple',
    'F': 'Green',
    'Cu': 'Brown',
    'K': 'Purple',
    'Pb': 'Dark Grey',
    'Au': 'Gold',
    'Ag': 'Silver',
    'Al': 'Silver',
    'Ar': 'Cyan',
    'Ba': 'Green',
    'Be': 'Dark Grey',
    'Bi': 'Pink',
    'B': 'Light Green',
    'Cd': 'Slate',
    'Cr': 'Dark Blue',
    'Co': 'Blue',
    'Ga': 'Silver',
    'He': 'Yellow',
    'Li': 'Purple',
    'Mn': 'Dark Brown',
    'Ni': 'Turquoise',
    'Ra': 'Violet',
    'Rb': 'Violet',
    'Sc': 'Silver',
    'Se': 'Orange',
    'Si': 'Dark Green',
    'Th': 'Slate'
};

export default function Page() {
    const [htmlContent, setHtmlContent] = useState('Loading...');
    const [sliderValue, setSliderValue] = useState(0);
    const [log, setLog] = useState('');
    const [error, setError] = useState(null);
    const [elements, setElements] = useState([]);

    const searchParams = useSearchParams();
    const visualId = searchParams.get('visualId');

    const handleSliderChange = (value) => {
        setSliderValue(value); // Update sliderValue when it changes in VideoVisual
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getfiles/' + visualId);
                const data = await response.json();
                setLog(data.log);

                // Parse topology file to find unique elements
                const topologyLines = data.topology.split('\n');
                const uniqueElements = new Set();

                topologyLines.forEach(line => {
                    const tokens = line.split(/\s+/);
                    if (tokens[0] === 'HETATM' && tokens.length > 9) {
                        let element = tokens[9];
                        // Remove anything after an underscore, including the underscore itself
                        element = element.split('_')[0];
                        uniqueElements.add(element);
                    }
                });

                setElements(Array.from(uniqueElements));
            } catch (error) {
                console.error('Error fetching data:', error);
                setError('Error fetching data');
            }
        };

        fetchData();
    }, [visualId]);

    return (
        <>
            <Navigation />
            <Container className={styles.pageContainer}>
                <Row>
                    <Col className={styles.visualizationCol}>
                        <VideoVisual visualId={visualId} onProgressChange={handleSliderChange} />
                    </Col>
                    <Col className={styles.textCol}>
                        <div className={styles.explanationText}>
                            <h4>Explanation Text</h4>
                            <div className={styles.legendContainer}>
                                <h5 className={styles.legendTitle}>Ion Color Legend</h5>
                                <div className={styles.legendGrid}>
                                    {elements.map(element => (
                                        <div key={element} className={styles.legendItem}>
                                            <div
                                                className={styles.colorBox}
                                                style={{ backgroundColor: ELEMENT_COLORS[element] || 'grey' }}
                                            ></div>
                                            <span className={styles.legendText}>{element} ({ELEMENT_COLORS[element] || 'Unknown Color'})</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={5} variableName="Total Energy" variableUnit="eV" />
                    </Col>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={3} variableName="Coulomb Energy" variableUnit="eV" />
                    </Col>
                </Row>
                <Row>
                    {/* <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={12} variableName="Long-Range Energy" variableUnit="eV" />
                    </Col> */}
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={2} variableName="Van der Waals Energy" variableUnit="eV" />
                    </Col>
                </Row>
            </Container>
        </>
    );
}
