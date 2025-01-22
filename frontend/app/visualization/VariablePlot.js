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
    maintainAspectRatio: false,
    animation: false,
});

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit }) {
    const [isSmooth, setIsSmooth] = useState(true);
    const [maxSteps, setMaxSteps] = useState(100);

    const phaseColors = {
        minimization: 'rgba(54, 162, 235, 1)',
        heating_1: 'rgba(255, 99, 132, 1)',
        pressure_equilibration_1: 'rgba(75, 192, 192, 1)',
        heating_2: 'rgba(255, 159, 64, 1)',
        pressure_equilibration_2: 'rgba(153, 102, 255, 1)',
        cooling: 'rgba(255, 206, 86, 1)',
        final_equilibration: 'rgba(201, 203, 207, 1)',
        heating: 'rgba(54, 235, 54, 1)',
    };

    const phaseLabels = {
        minimization: 'Algorithm minimization',
        heating_1: 'Heat (constant V) to room temperature',
        pressure_equilibration_1: 'Maintain (constant P) at room temperature',
        heating_2: 'Heat/anneal (constant V) to 1000K',
        pressure_equilibration_2: 'Maintain (constant P) at 1000K',
        cooling: 'Cool (constant V) to room temperature',
        final_equilibration: 'Equilibrate (constant V) at room temperature',
        heating: 'Heating',
    };

    const { steps, variableData, colors, datasets } = useMemo(() => {
        let steps = [];
        let variableData = [];
        let colors = [];
        let datasets = [];
        let insideData = false;
        let currentPhase = 'minimization';

        const phaseData = Object.keys(phaseLabels).reduce((acc, phase) => {
            acc[phase] = [];
            return acc;
        }, {});

        log.split('\n').forEach((line) => {
            if (line.includes('500 steps CG Minimization')) {
                currentPhase = 'minimization';
            } else if (line.includes('NVT dynamics to heat system x1')) {
                currentPhase = 'heating_1';
            } else if (line.includes('NPT dynamics with an isotropic pressure of 1atm. x1')) {
                currentPhase = 'pressure_equilibration_1';
            } else if (line.includes('NVT dynamics to heat system x2')) {
                currentPhase = 'heating_2';
            } else if (line.includes('NPT dynamics with an isotropic pressure of 1atm. x2')) {
                currentPhase = 'pressure_equilibration_2';
            } else if (line.includes('NVT dynamics to heat system x3')) {
                currentPhase = 'cooling';
            } else if (line.includes('NVT dynamics for equilibration')) {
                currentPhase = 'final_equilibration';
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
                let variableValue = parseFloat(columns[variableIndex]);

                if (!isNaN(step) && !isNaN(variableValue)) {
                    steps.push(step);
                    variableData.push(variableValue);
                    colors.push(phaseColors[currentPhase]);
                    phaseData[currentPhase].push({ x: step, y: variableValue });
                }
            }
        });

        datasets = Object.keys(phaseData).map((phase) => ({
            label: phaseLabels[phase],
            data: phaseData[phase],
            borderColor: phaseColors[phase],
            backgroundColor: phaseColors[phase],
            pointRadius: 0,
            fill: false,
            tension: 0.4,
        }));

        return { steps, variableData, colors, datasets };
    }, [log, variableIndex, phaseColors, phaseLabels]);

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

        const paddedData = [
            ...Array(Math.floor(kernelSize / 2)).fill(data[0]),
            ...data,
            ...Array(Math.floor(kernelSize / 2)).fill(data[data.length - 1]),
        ];

        return data.map((_, i) => {
            return paddedData.slice(i, i + kernelSize).reduce((sum, val, idx) => sum + val * kernel[idx], 0) / kernelSum;
        });
    };

    const mean = variableData.reduce((acc, val) => acc + val, 0) / variableData.length;
    const stdDev = Math.sqrt(variableData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / variableData.length);
    const lowerBound = mean - 2 * stdDev;
    const upperBound = mean + 2 * stdDev;

    const filteredData = steps.reduce(
        (acc, step, index) => {
            if (variableData[index] >= lowerBound && variableData[index] <= upperBound) {
                acc.steps.push(step);
                acc.variableData.push(variableData[index]);
                acc.colors.push(colors[index]);
            }
            return acc;
        },
        { steps: [], variableData: [], colors: [] }
    );

    const smoothData = isSmooth
        ? gaussianSmooth(filteredData.variableData)
        : filteredData.variableData;

    const filteredSteps = filteredData.steps;
    const filteredColors = filteredData.colors;

    const maxVisibleIndex = Math.floor((sliderValue / 100) * filteredSteps.length);
    const visibleVariableDataSlice = smoothData.slice(0, maxVisibleIndex);
    const visibleStepsSlice = filteredSteps.slice(0, maxVisibleIndex);
    const visibleColorsSlice = filteredColors.slice(0, maxVisibleIndex);

    const coords = visibleStepsSlice.map((el, index) => [el, visibleVariableDataSlice[index]]);
    const polynomialRegression = regression.polynomial(coords, { order: 1, precision: 5 });
    const polynomialFitData = polynomialRegression.points.map(([x, y]) => ({ x, y }));

    datasets.push({
        label: "Polynomial Fit",
        data: polynomialFitData,
        borderColor: "rgba(64, 64, 64, 1)",
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        tension: 0.4,
    });

    const data = {
        labels: visibleStepsSlice,
        datasets: [
            ...datasets,
            {
                label: `Step vs ${variableName} (${isSmooth ? 'Smooth' : 'Raw'})`,
                data: visibleVariableDataSlice,
                pointBackgroundColor: visibleColorsSlice,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                tension: 0.4,
            },
        ],
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
                <Col style={{ height: '500px', width: '100%' }}>
                    <Line data={data} options={options(variableName, variableUnit)} />
                </Col>
            </Row>
        </Container>
    );
}
