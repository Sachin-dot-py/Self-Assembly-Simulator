'use client';

import React, { useState, useEffect } from 'react';
import styles from "./page.module.css";
import Navigation from './components/Navigation';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Image from 'next/image';
import { FaPlay, FaInfoCircle } from 'react-icons/fa';
import Footer from './components/Footer';

const ACCESS_KEY = "toolAccess";
const EXPIRATION_DAYS = 3; // set the expiration duration in days

export default function Home() {
    const [accessGranted, setAccessGranted] = useState(true);
    const [password, setPassword] = useState("");
  
    // Check localStorage for saved access on component mount
    useEffect(() => {
      const storedAccess = localStorage.getItem(ACCESS_KEY);
      if (storedAccess) {
        const { expiration } = JSON.parse(storedAccess);
        // If current time is less than expiration, grant access
        if (new Date().getTime() < expiration) {
          setAccessGranted(true);
        } else {
          // Otherwise remove expired token
          localStorage.removeItem(ACCESS_KEY);
        }
      } else {
        setAccessGranted(false);
      }
    }, []);
  
    const handleSubmit = (e) => {
      e.preventDefault();

      if (password === "Self-Assembly") { // Password is a formality, doesn't have to be secure
        setAccessGranted(true);
        const expiration = new Date().getTime() + EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
        localStorage.setItem(ACCESS_KEY, JSON.stringify({ expiration }));
      } else {
        alert("Incorrect password");
      }
    };

    if (!accessGranted) {
        return (
            <div className={styles.accessContainer}>
                <Card className={styles.accessCard}>
                    <Card.Body>
                        <Card.Title>Tool in Development</Card.Title>
                        <Card.Text>
                            This tool is still being developed. Enter password to use. If you want to request access, contact{' '}
                            <a href="mailto:saramanathan@ucsd.edu">saramanathan@ucsd.edu</a>.
                        </Card.Text>
                        <form onSubmit={handleSubmit}>
                            <input
                                type="password"
                                placeholder="Enter password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={styles.passwordInput}
                            />
                            <Button type="submit" className={styles.submitButton}>Submit</Button>
                        </form>
                    </Card.Body>
                </Card>
            </div>
        );
    }

    return (
        <>
            <Navigation />
            <div className={styles.homeContainer}>
                <header className={styles.heroSection}>
                    <div className={styles.heroContent}>
                        <h1>Welcome to the Self-Assembly Simulator</h1>
                        <p>Learn how nanoparticles form structures through self-assembly through interactive simulations.</p>
                        <Button href="/ionic-bonding" variant="primary" className={styles.exploreButton}>
                            <FaPlay style={{ marginRight: '0.5rem' }} /> Get Started
                        </Button>
                    </div>
                    <div className={styles.heroImage}>
                        <Image src="/static/nano2.png" alt="Self-Assembly Visualization" width={400} height={300} />
                    </div>
                </header>
                <Footer />
                <br /><br />
                <section className={styles.featuresSection}>
                    <h2>Tools</h2>
                    <div className={styles.featuresContainer}>
                        <Card className={styles.featureCard}>
                            <Card.Body>
                                <Card.Title>Ionic Bonding</Card.Title>
                                <Card.Text>
                                    Use our interactive editor to draw chemical structures and simulate their self-assembly process.
                                </Card.Text>
                                <Button href="/ionic-bonding" variant="outline-primary">Get Started</Button>
                            </Card.Body>
                        </Card>
                        <Card className={styles.featureCard}>
                            <Card.Body>
                                <Card.Title>Gold Nanoparticles</Card.Title>
                                <Card.Text>
                                    Visualize the self-assembly of gold nanoparticles with our interactive simulation tool.
                                </Card.Text>
                                <Button href="/gold-nanoparticles" variant="outline-primary">View Demo</Button>
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
