'use client';

import styles from "./page.module.css";
import Navigation from './components/Navigation';

export default function Home() {

    return (
        <>
        <Navigation />
        <div className={styles.container}>
            <p> Welcome! </p>
        </div>
        </>
    );
}
