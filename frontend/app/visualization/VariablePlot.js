import React, { useEffect, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import regression from 'regression';
import { Form, Container, Row, Col } from 'react-bootstrap';

const options = (variableName, variableUnit) => ({
    plugins: {
        title: {
            text: `${variableName}`,
            display: true,
            font: {
                size: 20,
            },
            padding: {
                top: 10,
                bottom: 30,
            },
        },
        legend: {
            display: true,
            position: 'top',
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Step',
                font: {
                    size: 14,
                },
            },
        },
        y: {
            title: {
                display: true,
                text: `${variableName} (${variableUnit})`,
                font: {
                    size: 14,
                },
            },
        },
    },
    responsive: true,
    animation: false,
});

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit }) {
    const [isSmooth, setIsSmooth] = useState(true); // Toggle State
    const [maxSteps, setMaxSteps] = useState(100);

    const minimizationColor = 'rgba(54, 162, 235, 1)';
    const heatingColor = 'rgba(255, 99, 132, 1)';

    const { steps, variableData, colors } = useMemo(() => {
        let variableIndex = 0;
        let steps = [];
        let variableData = [];
        let colors = [];
        let insideData = false;
        let currentPhase = 'minimization';

        log.split('\n').forEach((line) => {
            if (line.includes('500 steps CG Minimization')) {
                currentPhase = 'minimization';
            } else if (line.includes('NVT dynamics to heat system')) {
                currentPhase = 'heating';
            }

            if (line.includes('Step')) {
                insideData = true;
                return;
            }
            if (insideData && (line.includes('SHAKE') || line.includes('Bond'))) {
                return;
            }
            if (insideData && line.includes('Loop time of')) {
                insideData = false;
                return;
            }
            if (insideData) {
                let columns = line.trim().split(/\s+/);
                let step = parseInt(columns[0]);
                if (step <= 2500) return;
                let variableValue = parseFloat(columns[variableIndex]);

                let color = currentPhase === 'minimization' ? minimizationColor : heatingColor;
                
                // Downsample to every 10th step (for smoothing)
                if (variableIndex % 10 === 0) {
                    steps.push(step);
                    variableData.push(variableValue);
                    colors.push(color);
                }
                variableIndex++;
            }
        });

        return { steps, variableData, colors };
    }, [log, variableIndex, minimizationColor, heatingColor]);

    useEffect(() => {
        setMaxSteps(steps.length);
    }, [steps]);

    const gaussianSmooth = (data, sigma = 2) => {
        const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
        const kernel = Array.from({ length: kernelSize }, (_, i) => {
            const x = i - Math.floor(kernelSize / 2);
            return Math.exp(-(x * x) / (2 * sigma * sigma));
        });
        const kernelSum = kernel.reduce((a, b) => a + b, 0);

        // Edge padding
        const paddedData = [
            ...Array(Math.floor(kernelSize / 2)).fill(data[0]), // Pad start with first data value
            ...data,
            ...Array(Math.floor(kernelSize / 2)).fill(data[data.length - 1]), // Pad end with last data value
        ];
    
        const smoothed = data.map((_, i) => {
            let weightedSum = 0;
            for (let j = 0; j < kernelSize; j++) {
                const idx = i + j; // Index in the padded data
                weightedSum += paddedData[idx] * kernel[j];
            }
            return weightedSum / kernelSum;
        });
    
        return smoothed;
    };    

    const smoothData = isSmooth ? gaussianSmooth(variableData) : variableData;

    const filteredData = steps.reduce(
        (acc, step, index) => {
            if (!isNaN(step) && !isNaN(smoothData[index])) {
                acc.steps.push(step);
                acc.variableData.push(smoothData[index]);
                acc.colors.push(colors[index]);
            }
            return acc;
        },
        { steps: [], variableData: [], colors: [] }
    );

    let { steps: filteredSteps, variableData: filteredVariableData, colors: filteredColors } = filteredData;

    // Calculate the mean and standard deviation
    const mean = filteredVariableData.reduce((acc, val) => acc + val, 0) / filteredVariableData.length;
    const stdDev = Math.sqrt(filteredVariableData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / filteredVariableData.length);

    // Set a clipping threshold at mean ± 2 * stdDev (can adjust this factor if needed)
    const lowerBound = mean - 2 * stdDev;
    const upperBound = mean + 2 * stdDev;

    // Filter data to remove outliers based on this threshold
    filteredVariableData = filteredVariableData.filter((value, index) => value >= lowerBound && value <= upperBound);
    filteredSteps = filteredSteps.filter((_, index) => filteredVariableData[index] >= lowerBound && filteredVariableData[index] <= upperBound);
    filteredColors = filteredColors.filter((_, index) => filteredVariableData[index] >= lowerBound && filteredVariableData[index] <= upperBound);

    const maxVisibleIndex = Math.floor((sliderValue / 100) * filteredSteps.length);
    const visibleVariableDataSlice = filteredVariableData.slice(0, maxVisibleIndex);
    const visibleStepsSlice = filteredSteps.slice(0, maxVisibleIndex);
    const visibleColorsSlice = filteredColors.slice(0, maxVisibleIndex);
    
    const coords = visibleStepsSlice.map((el, index) => [el, visibleVariableDataSlice[index]]);
    const polynomialRegression = regression.polynomial(coords, { order: 1, precision: 5 });
    const polynomialFitData = polynomialRegression.points.map(([x, y]) => ({ x, y }));    

    const data = {
        labels: visibleStepsSlice,
        datasets: [
            {
                label: `Step vs ${variableName} (${isSmooth ? 'Smooth' : 'Raw'})`,
                data: visibleVariableDataSlice,
                pointBackgroundColor: visibleColorsSlice,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                tension: 0.4,
                order: 1,
            },
            {
                label: "Polynomial Fit",
                data: polynomialFitData.map(point => point.y),
                borderColor: "rgba(64, 64, 64, 1)",
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                tension: 0.4,
                order: 0
            }
        ]
    };

    return (
        <Container>
            <Row className="mb-3">
                <Col>
                    <Form>
                        <Form.Check
                            type="switch"
                            id="data-toggle"
                            label={isSmooth ? 'Smooth Data' : 'Raw Data'}
                            checked={isSmooth}
                            onChange={() => setIsSmooth((prev) => !prev)}
                        />
                    </Form>
                </Col>
            </Row>
            <Row>
                <Col style={{ height: '100%', width: '100%' }}>
                    <Line data={data} options={options(variableName, variableUnit)} />
                </Col>
            </Row>
        </Container>
    );
}
