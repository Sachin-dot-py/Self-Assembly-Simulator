'use client';

import styles from "./page.module.css";
import Navigation from './components/Navigation';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Image from 'next/image';
import { FaPlay, FaInfoCircle } from 'react-icons/fa';

export default function Home() {

    return (
        <>
            <Navigation />
            <div className={styles.homeContainer}>
                <header className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <h1>Welcome to the Self-Assembly Simulator</h1>
                        <p>Learn how nanoparticles form structures through self-assembly through interactive simulations.</p>
                        <Button variant="primary" className={styles.exploreButton}>
                            <FaPlay style={{ marginRight: '0.5rem' }} /> Get Started
                        </Button>
                    </div>
                    <div className={styles.heroImage}>
                        <Image src="/static/nano2.png" alt="Self-Assembly Visualization" width={400} height={300} />
                    </div>
                </header>
                <section className={styles.featuresSection}>
                    <h2>Tools</h2>
                    <div className={styles.featuresContainer}>
                        <Card className={styles.featureCard}>
                            <Card.Body>
                                <Card.Title>Ionic Bonding</Card.Title>
                                <Card.Text>
                                    Use our interactive editor to draw chemical structures and simulate their self-assembly process.
                                </Card.Text>
                                <Button variant="outline-primary">Get Started</Button>
                            </Card.Body>
                        </Card>
                        <Card className={styles.featureCard}>
                            <Card.Body>
                                <Card.Title>Gold Nanoparticles</Card.Title>
                                <Card.Text>
                                    Visualize the self-assembly of gold nanoparticles with our interactive simulation tool.
                                </Card.Text>
                                <Button variant="outline-primary">View Demo</Button>
                            </Card.Body>
                        </Card>
                        <Card className={styles.featureCard}>
                            <Card.Body>
                                <Card.Title>More Tools</Card.Title>
                                <Card.Text>
                                    More interactive tools coming soon!
                                </Card.Text>
                                <Button variant="outline-primary">Coming soon...</Button>
                            </Card.Body>
                        </Card>
                    </div>
                </section>
                <section className={styles.aboutSection}>
                    <h2>About Self-Assembly</h2>
                    <p>
                        Self-assembly is a process by which molecules and ions form ordered structures without external guidance. Explore the principles behind this phenomenon and see how different factors influence the assembly process.
                    </p>
                    <Button variant="secondary" className={styles.learnMoreButton}>
                        <FaInfoCircle style={{ marginRight: '0.5rem' }} /> Learn More
                    </Button>
                </section>
            </div>
        </>
    );
}
