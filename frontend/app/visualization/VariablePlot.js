import React, { useEffect, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import regression from 'regression';
import { Form, Container, Row, Col } from 'react-bootstrap';

const options = (variableName, variableUnit, plotType, isCSVFormat) => ({
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
            display: plotType === "ionic",
            position: 'top',
            labels: {
                // Custom legend to label each phase color
                generateLabels: (chart) => {
                    if (isCSVFormat) {
                        // UMA/CSV format phases
                        return [
                            { text: "NPT heating: 1 → 298 K", fillStyle: 'rgba(255, 69, 0, 1)' },
                            { text: "NPT equilibration: 298 K", fillStyle: 'rgba(30, 144, 255, 1)' },
                            { text: "NPT heating: 298 → 1000 K", fillStyle: 'rgba(255, 140, 0, 1)' },
                            { text: "NPT equilibration: 1000 K", fillStyle: 'rgba(100, 149, 237, 1)' },
                            { text: "NPT cooling: 1000 → 298 K", fillStyle: 'rgba(0, 191, 255, 1)' },
                            { text: "Final NVT equilibration", fillStyle: 'rgba(144, 238, 144, 1)' },
                        ];
                    } else {
                        // LAMMPS format phases
                        return [
                            { text: "Algorithm minimization", fillStyle: 'rgba(128, 128, 128, 1)' },
                            { text: "Heat (constant V) to room temperature", fillStyle: 'rgba(255, 69, 0, 1)' },
                            { text: "Maintain (constant P) at room temperature", fillStyle: 'rgba(30, 144, 255, 1)' },
                            { text: "Heat/anneal (constant V) to 1000K", fillStyle: 'rgba(255, 140, 0, 1)' },
                            { text: "Maintain (constant P) at 1000K", fillStyle: 'rgba(100, 149, 237, 1)' },
                            { text: "Cool (constant P) to room temperature", fillStyle: 'rgba(0, 191, 255, 1)' },
                            { text: "Equilibrate (constant V) at room temperature", fillStyle: 'rgba(144, 238, 144, 1)' },
                        ];
                    }
                },
            },
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: isCSVFormat ? 'Time (ps)' : 'Step',
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

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit, plotType="gold" }) {
    const [isSmooth, setIsSmooth] = useState(true);

    // UMA/CSV phase colors
    const csvPhaseColors = {
        heat1: 'rgba(255, 69, 0, 1)',
        equilibrate1: 'rgba(30, 144, 255, 1)',
        heat2: 'rgba(255, 140, 0, 1)',
        equilibrate2: 'rgba(100, 149, 237, 1)',
        cool: 'rgba(0, 191, 255, 1)',
        final_equilibrate: 'rgba(144, 238, 144, 1)',
    };

    // LAMMPS phase colors
    const lammpsPhaseColors = {
        minimization: 'rgba(128, 128, 128, 1)',
        heating_1: 'rgba(255, 69, 0, 1)',
        pressure_equilibration_1: 'rgba(30, 144, 255, 1)',
        heating_2: 'rgba(255, 140, 0, 1)',
        pressure_equilibration_2: 'rgba(100, 149, 237, 1)',
        cooling: 'rgba(0, 191, 255, 1)',
        final_equilibration: 'rgba(144, 238, 144, 1)',
        heating: 'rgba(255, 99, 71, 1)',
    };

    // CSV column indices for thermo.csv
    const csvColumns = {
        md_step: 0,
        time_ps: 1,
        phase: 2,
        ensemble: 3,
        temperature_K: 4,
        potential_energy_eV: 5,
        kinetic_energy_eV: 6,
        total_energy_eV: 7,
        volume_A3: 8,
        density_g_cm3: 9,
        pressure_bar: 10,
    };

    // Detect if log is CSV format (starts with header containing md_step)
    const isCSVFormat = useMemo(() => {
        const firstLine = log.split('\n')[0];
        return firstLine && firstLine.includes('md_step');
    }, [log]);

    const { xData, variableData, colors } = useMemo(() => {
        const lines = log.split('\n');
        let xData = [];
        let variableData = [];
        let colors = [];

        if (isCSVFormat) {
            // Parse CSV format (UMA thermo.csv)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const columns = line.split(',');
                if (columns.length < 11) continue;

                const time = parseFloat(columns[csvColumns.time_ps]);
                const phase = columns[csvColumns.phase];

                // Get value based on variableName
                let value;
                switch (variableName) {
                    case 'Total Energy':
                        value = parseFloat(columns[csvColumns.total_energy_eV]);
                        break;
                    case 'Potential Energy':
                        value = parseFloat(columns[csvColumns.potential_energy_eV]);
                        break;
                    case 'Kinetic Energy':
                        value = parseFloat(columns[csvColumns.kinetic_energy_eV]);
                        break;
                    case 'Temperature':
                        value = parseFloat(columns[csvColumns.temperature_K]);
                        break;
                    case 'Pressure':
                        value = parseFloat(columns[csvColumns.pressure_bar]);
                        break;
                    case 'Density':
                        value = parseFloat(columns[csvColumns.density_g_cm3]);
                        break;
                    default:
                        value = NaN;
                }

                const color = csvPhaseColors[phase] || 'rgba(128, 128, 128, 1)';

                if (!isNaN(time) && !isNaN(value)) {
                    xData.push(time);
                    variableData.push(value);
                    colors.push(color);
                }
            }
        } else {
            // Parse LAMMPS log format
            let insideData = false;
            let currentPhase = 'minimization';

            lines.forEach((line) => {
                // Detect phase changes
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
                } else if (line.includes('NPT dynamics to cool system')) {
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
                    if (step < 100) {
                        return;
                    }
                    let variableValue = parseFloat(columns[variableIndex]);
                    let color = lammpsPhaseColors[currentPhase];

                    if (!isNaN(step) && !isNaN(variableValue)) {
                        xData.push(step);
                        variableData.push(variableValue);
                        colors.push(color);
                    }
                }
            });
        }

        return { xData, variableData, colors };
    }, [log, variableName, variableIndex, isCSVFormat]);

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

    const filteredData = xData.reduce(
        (acc, x, index) => {
            if (variableData[index] >= lowerBound && variableData[index] <= upperBound) {
                acc.xData.push(x);
                acc.variableData.push(variableData[index]);
                acc.colors.push(colors[index]);
            }
            return acc;
        },
        { xData: [], variableData: [], colors: [] }
    );

    const smoothData = isSmooth
        ? gaussianSmooth(filteredData.variableData)
        : filteredData.variableData;

    const filteredX = filteredData.xData;
    const filteredColors = filteredData.colors;

    const maxVisibleIndex = Math.floor((sliderValue / 100) * filteredX.length);
    const visibleVariableDataSlice = smoothData.slice(0, maxVisibleIndex);
    const visibleXSlice = filteredX.slice(0, maxVisibleIndex);
    const visibleColorsSlice = filteredColors.slice(0, maxVisibleIndex);

    const xLabel = isCSVFormat ? 'Time' : 'Step';
    const data = {
        labels: visibleXSlice,
        datasets: [
            {
                label: `${xLabel} vs ${variableName} (${isSmooth ? 'Smooth' : 'Raw'})`,
                data: visibleVariableDataSlice,
                pointBackgroundColor: visibleColorsSlice,
                borderColor: 'rgba(0, 0, 0, 0.1)',
                tension: 0.4,
                order: 1,
            },
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
                <Col style={{ height: '500px', width: '100%' }}>
                    <Line data={data} options={options(variableName, variableUnit, plotType, isCSVFormat)} />
                </Col>
            </Row>
        </Container>
    );
}
