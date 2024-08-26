'use client'

import styles from './page.module.css';
import EnergyPlot from './EnergyPlot';
import Visualization from '../components/Visualization';
import Container from 'react-bootstrap/Container';
import Navigation from '../components/Navigation';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation'

export default function Page() {
    const [htmlContent, setHtmlContent] = useState('Loading...');

    const searchParams = useSearchParams()
 
    const visualId = searchParams.get('visualId')

    useEffect(() => {
        const fetchHtml = async () => {
            try {
                const response = await fetch('/api/getfile/visual'+ visualId +'.html');
                if (response.ok) {
                    const resp = await response.json();
                    setHtmlContent(resp.content);
                } else {
                    console.error('Failed to fetch HTML content');
                }
            } catch (error) {
                console.error('Error fetching HTML content:', error);
            }
        };

        fetchHtml();
    }, []);

    return (
        <>
            <Navigation />
            <Container className={styles.pageContainer}>
                <Row>
                    <Col className={styles.visualizationCol}>
                        <Visualization markup={htmlContent} />
                    </Col>
                    <Col className={styles.plotCol}>
                        <EnergyPlot visualId={visualId} />
                    </Col>
                </Row>
                <Row>
                    <Col className={styles.textCol}>
                        <div className={styles.explanationText}>Explanation text <br /> Explanation text</div>
                    </Col>
                    <Col className={styles.plotCol}>
                        <EnergyPlot visualId={visualId} />
                    </Col>
                </Row>
            </Container>
        </>
    )
}