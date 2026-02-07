'use client'

import styles from './page.module.css';
import VariablePlot from './VariablePlot';
import Container from 'react-bootstrap/Container';
import Navigation from '../components/Navigation';
import dynamic from 'next/dynamic';
import { getAtomColorBySymbol, rgbToCss } from '../../3d-viewer/utils/atomTypes';

const TrajectoryViewer = dynamic(
  () => import('../../3d-viewer').then((mod) => mod.TrajectoryViewer),
  {
    ssr: false,
    loading: () => (
      <div style={{
        width: '100%',
        height: '500px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
        color: 'white'
      }}>
        Loading 3D viewer...
      </div>
    )
  }
);
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaBell } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function Page() {
    const [htmlContent, setHtmlContent] = useState('Loading...');
    const [sliderValue, setSliderValue] = useState(0);
    const [log, setLog] = useState('');
    const [error, setError] = useState(null);
    const [elements, setElements] = useState([]);
    const [trajectory, setTrajectory] = useState('');

    const searchParams = useSearchParams();
    const visualId = searchParams.get('visualId');

    const handleSliderChange = (value) => {
        setSliderValue(value); // Update sliderValue when it changes in VideoVisual
    };

    const handleFrameChange = (frame, totalFrames, progress) => {
        setSliderValue(progress);
    };

    const [isRinging, setIsRinging] = useState(false);

    const handleRing = () => {
      setIsRinging(true);
      setTimeout(() => setIsRinging(false), 1000); // Animation lasts for 1 second
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getfiles/' + visualId);
                if (!response.ok) {
                    throw new Error(`API returned ${response.status}`);
                }
                const data = await response.json();
                console.log('Visualization page: Fetched data', {
                    logLength: data.log?.length || 0,
                    trajectoryLength: data.trajectory?.length || 0,
                    topologyLength: data.topology?.length || 0
                });
                setLog(data.log || '');
                setTrajectory(data.trajectory || '');
                setHtmlContent(data.topology || '');

                // Parse topology file (BGF format) to find unique elements
                const topologyLines = data.topology.split('\n');
                const uniqueElements = new Set();

                topologyLines.forEach((line) => {
                    if (!line.startsWith('HETATM') && !line.startsWith('ATOM  ')) return;
                    const tokens = line.trim().split(/\s+/);
                    if (tokens.length >= 3) {
                        // Atom name is token[2] (e.g. "Na1", "Cl1") — strip trailing digits
                        let element = tokens[2].replace(/\d+$/, '');
                        element = element.charAt(0).toUpperCase() + element.slice(1).toLowerCase();
                        uniqueElements.add(element);
                    }
                });

                console.log('Visualization page: Found elements:', Array.from(uniqueElements));
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
                        <TrajectoryViewer
                            trajectoryContent={trajectory}
                              topologyContent={htmlContent}
                            height="500px"
                            width="100%"
                            autoPlay={false}
                            showControls={true}
                            showSimulationBox={true}
                            particleRadius={0.4}
                            onFrameChange={handleFrameChange}
                        />
                    </Col>
                    <Col className={styles.textCol}>
                        <div className={styles.explanationText}>
                            <h4>Welcome to the Results Page!</h4>
                            <p>
Here, you can explore how your 2D system evolves over time.
<br /><br />
You&apos;ll find a video showing how atoms moved during the optimization process, along with plots describing the most important evolving properties of your self-assembling structure. In the video, atoms are placed in an imaginary 2D periodic box. The simulation assumes atoms interact with their periodic images outside the box, enhancing realism. Therefore, we show a few of these periodic images outside of the box as well for better visualization!
<br /><br />
The simulation mimics annealing, a process used in metallurgy to obtain desired atomic organizations in metals that can make them more malleable, for instance. Initially, an algorithm minimizes the system&apos;s energy at 0 Kelvin (notice the temperature plot), seeking a lower-energy arrangement of atoms. This may not be the lowest-energy structure possible, but it already shows signs of assembling into a more stable configuration.
<br /><br />
Next, atoms are heated to room temperature (298K), when kinetic energy starts affecting their movement. During this process, the original box dimensions are also reshaped into a square (notice the volume plot) to allow the atoms to get closer together independent of the original configuration. Then, volume is allowed to freely change to better fit the atoms, creating a more periodic structure with positive and negative atoms interleaved. This structure should have a lower total energy than the one after minimization, but it might still be stuck in a local energy minima, so we need to give the atoms more energy to vibrate more and possibly assemble in more stable states.
<br /><br />
Subsequent steps heat the material to 1000K at the fixed volume, then adjust volume at constant temperature and pressure. This provides enough energy for atoms to overcome energy barriers that may be trapping them into less stable configurations. At this point, you may notice some new atomic configurations enabled by the extra kinetic energy that might not be the most stable at room temperature. In metallurgy, if someone wants to maintain such configurations, they quickly drench the material in water to &quot;trap&quot; the atoms in that volume and layout.
<br /><br />
Finally, atoms are cooled back to room temperature while allowing for the volume to vary, stabilizing the structure into its most optimal configuration in normal conditions. This process ensures your structure achieves its lowest energy, most stable self-assembled geometry at room temperature. If you don&apos;t see that in the total energy plot ring the &quot;unexpected results&quot; bell below because you might have discovered a cool new material structure!
<br /><br />
<div className="container">
      <div className="bell-container">
        <label className="bell-label">Press the Bell!</label>
        <motion.div
          className="bell"
          animate={isRinging ? { rotate: [0, -15, 15, -10, 10, 0] } : {}}
          transition={{ duration: 1, ease: "easeInOut" }}
          onClick={handleRing}
        >
          <FaBell color="#334e82" size="50" className="icon" />
        </motion.div>
      </div>
      {isRinging && (
        <motion.div
          className="message"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
        >
          Ding! You might have found something cool!
        </motion.div>
      )}
</div>
<br /><br />
Repeat the video a few times while looking at the plots and notice how each property is influenced by each state of the system! Try to identify the isobaric (constant pressure), isovolumetric (constant volume), and isothermal (constant temperature) steps!
</p>
                            <div className={styles.legendContainer}>
                                <h5 className={styles.legendTitle}>Ion Color Legend</h5>
                                <div className={styles.legendGrid}>
                                    {elements.map(element => (
                                        <div key={element} className={styles.legendItem}>
                                            <div
                                                className={styles.colorBox}
                                                style={{
                                                    backgroundColor: rgbToCss(getAtomColorBySymbol(element) || { r: 128, g: 128, b: 128 })
                                                }}
                                            ></div>
                                            <span className={styles.legendText}>
                                                {element} ({rgbToCss(getAtomColorBySymbol(element) || { r: 128, g: 128, b: 128 })})
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>
                <Row>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={1} variableName="Temperature" variableUnit="K" plotType="ionic" />
                    </Col>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={3} variableName="Potential Energy" variableUnit="kcal/mol" plotType="ionic" />
                    </Col>
                </Row>
                <Row>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={4} variableName="Kinetic Energy" variableUnit="kcal/mol" plotType="ionic" />
                    </Col>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={5} variableName="Total Energy" variableUnit="kcal/mol" plotType="ionic" />
                    </Col>
                </Row>
                <Row>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={20} variableName="Density" variableUnit="g/cm³" plotType="ionic" />
                    </Col>
                    <Col className={styles.plotCol}>
                        <VariablePlot log={log} sliderValue={sliderValue} variableIndex={2} variableName="Pressure" variableUnit="atm" plotType="ionic" />
                    </Col>
                </Row>
            </Container>
        </>
    );
}
