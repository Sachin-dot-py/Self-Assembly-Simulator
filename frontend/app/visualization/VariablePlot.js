import React, { useEffect, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import regression from 'regression';
import { Form, Container, Row, Col } from 'react-bootstrap';

const options = (variableName, variableUnit, plotType) => ({
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
                    return [
                        {
                            text: "NPT heating: 1 → 298 K",
                            fillStyle: 'rgba(255, 69, 0, 1)',
                        },
                        {
                            text: "NPT equilibration: 298 K",
                            fillStyle: 'rgba(30, 144, 255, 1)',
                        },
                        {
                            text: "NPT heating: 298 → 1000 K",
                            fillStyle: 'rgba(255, 140, 0, 1)',
                        },
                        {
                            text: "NPT equilibration: 1000 K",
                            fillStyle: 'rgba(100, 149, 237, 1)',
                        },
                        {
                            text: "NPT cooling: 1000 → 298 K",
                            fillStyle: 'rgba(0, 191, 255, 1)',
                        },
                        {
                            text: "Final NVT equilibration",
                            fillStyle: 'rgba(144, 238, 144, 1)',
                        },
                    ];
                },
            },
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: 'Time (ps)',
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

export default function VariablePlot({ log, sliderValue, variableName, variableUnit, plotType="gold" }) {
    const [isSmooth, setIsSmooth] = useState(true);

    // UMA phase colors
    const phaseColors = {
        heat1: 'rgba(255, 69, 0, 1)',
        equilibrate1: 'rgba(30, 144, 255, 1)',
        heat2: 'rgba(255, 140, 0, 1)',
        equilibrate2: 'rgba(100, 149, 237, 1)',
        cool: 'rgba(0, 191, 255, 1)',
        final_equilibrate: 'rgba(144, 238, 144, 1)',
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

    const { timeData, variableData, colors } = useMemo(() => {
        const lines = log.split('\n');
        let timeData = [];
        let variableData = [];
        let colors = [];

        // Skip header line, parse CSV data
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

            const color = phaseColors[phase] || 'rgba(128, 128, 128, 1)';

            if (!isNaN(time) && !isNaN(value)) {
                timeData.push(time);
                variableData.push(value);
                colors.push(color);
            }
        }

        return { timeData, variableData, colors };
    }, [log, variableName]);

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

    const filteredData = timeData.reduce(
        (acc, time, index) => {
            if (variableData[index] >= lowerBound && variableData[index] <= upperBound) {
                acc.timeData.push(time);
                acc.variableData.push(variableData[index]);
                acc.colors.push(colors[index]);
            }
            return acc;
        },
        { timeData: [], variableData: [], colors: [] }
    );

    const smoothData = isSmooth
        ? gaussianSmooth(filteredData.variableData)
        : filteredData.variableData;

    const filteredTime = filteredData.timeData;
    const filteredColors = filteredData.colors;

    const maxVisibleIndex = Math.floor((sliderValue / 100) * filteredTime.length);
    const visibleVariableDataSlice = smoothData.slice(0, maxVisibleIndex);
    const visibleTimeSlice = filteredTime.slice(0, maxVisibleIndex);
    const visibleColorsSlice = filteredColors.slice(0, maxVisibleIndex);

    const data = {
        labels: visibleTimeSlice,
        datasets: [
            {
                label: `Time vs ${variableName} (${isSmooth ? 'Smooth' : 'Raw'})`,
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
                    <Line data={data} options={options(variableName, variableUnit, plotType)} />
                </Col>
            </Row>
        </Container>
    );
}
