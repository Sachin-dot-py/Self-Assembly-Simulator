import React, { useEffect, useState, useMemo } from 'react';
import Chart from 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import regression from 'regression';
import { Form, Container, Row, Col } from 'react-bootstrap';

const lammpsLegendLabels = [
    { text: "Algorithm minimization", fillStyle: 'rgba(128, 128, 128, 1)' },
    { text: "Heat (constant V) to room temperature", fillStyle: 'rgba(255, 69, 0, 1)' },
    { text: "Maintain (constant P) at room temperature", fillStyle: 'rgba(30, 144, 255, 1)' },
    { text: "Heat/anneal (constant V) to 1000K", fillStyle: 'rgba(255, 140, 0, 1)' },
    { text: "Maintain (constant P) at 1000K", fillStyle: 'rgba(100, 149, 237, 1)' },
    { text: "Cool (constant P) to room temperature", fillStyle: 'rgba(0, 191, 255, 1)' },
    { text: "Equilibrate (constant V) at room temperature", fillStyle: 'rgba(144, 238, 144, 1)' },
];

const goldLegendLabels = [
    { text: "Algorithm minimization", fillStyle: 'rgba(128, 128, 128, 1)' },
    { text: "Heat (constant V) to room temperature", fillStyle: 'rgba(255, 99, 71, 1)' },
    { text: "Maintain (constant P) at room temperature", fillStyle: 'rgba(30, 144, 255, 1)' },
];

const csvLegendLabels = [
    { text: "NPT heating: 1 → 298 K", fillStyle: 'rgba(255, 69, 0, 1)' },
    { text: "NPT equilibration: 298 K", fillStyle: 'rgba(30, 144, 255, 1)' },
    { text: "NPT heating: 298 → 1000 K", fillStyle: 'rgba(255, 140, 0, 1)' },
    { text: "NPT equilibration: 1000 K", fillStyle: 'rgba(100, 149, 237, 1)' },
    { text: "NPT cooling: 1000 → 298 K", fillStyle: 'rgba(0, 191, 255, 1)' },
    { text: "Final NVT equilibration", fillStyle: 'rgba(144, 238, 144, 1)' },
];

const options = (variableName, variableUnit, plotType, isCSV) => {
    // Show legend for ionic plots, CSV plots, and gold (LAMMPS) plots
    const showLegend = plotType === "ionic" || isCSV || plotType === "gold";

    return {
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
            display: showLegend,
            position: 'top',
            labels: {
                generateLabels: (chart) => {
                    let labels;
                    if (isCSV) {
                        labels = csvLegendLabels;
                    } else if (plotType === "gold") {
                        labels = goldLegendLabels;
                    } else {
                        labels = lammpsLegendLabels;
                    }
                    return labels.map((item) => ({
                        text: item.text,
                        fillStyle: item.fillStyle,
                        strokeStyle: item.fillStyle,
                        lineWidth: 4,
                    }));
                },
            },
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: isCSV ? 'Time (ps)' : 'Step',
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
    };
};

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit, plotType="gold" }) {
    const [isSmooth, setIsSmooth] = useState(true);

    const phaseColors = {
        minimization: 'rgba(128, 128, 128, 1)',
        heating_1: 'rgba(255, 69, 0, 1)',
        pressure_equilibration_1: 'rgba(30, 144, 255, 1)',
        heating_2: 'rgba(255, 140, 0, 1)',
        pressure_equilibration_2: 'rgba(100, 149, 237, 1)',
        cooling: 'rgba(0, 191, 255, 1)',
        final_equilibration: 'rgba(144, 238, 144, 1)',
        heating: 'rgba(255, 99, 71, 1)',
    };

    const csvPhaseColors = {
        heat1: 'rgba(255, 69, 0, 1)',
        equilibrate1: 'rgba(30, 144, 255, 1)',
        heat2: 'rgba(255, 140, 0, 1)',
        equilibrate2: 'rgba(100, 149, 237, 1)',
        cool: 'rgba(0, 191, 255, 1)',
        final_equilibrate: 'rgba(144, 238, 144, 1)',
    };

    const csvColumns = {
        md_step: 0, time_ps: 1, phase: 2, ensemble: 3,
        temperature_K: 4, potential_energy_eV: 5, kinetic_energy_eV: 6,
        total_energy_eV: 7, volume_A3: 8, density_g_cm3: 9, pressure_bar: 10,
    };

    // Detect CSV format by checking if first line contains the CSV header
    const isCSV = useMemo(() => {
        if (!log) return false;
        const firstLine = log.split('\n')[0];
        return firstLine && firstLine.includes('md_step');
    }, [log]);

    const { xData, variableData, colors } = useMemo(() => {
        let xData = [];
        let variableData = [];
        let colors = [];

        if (!log) return { xData, variableData, colors };

        if (isCSV) {
            // ---- CSV / UMA thermo.csv path ----
            const lines = log.split('\n');
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                const cols = line.split(',');
                if (cols.length < 11) continue;

                const time = parseFloat(cols[csvColumns.time_ps]);
                const phase = cols[csvColumns.phase];

                let value;
                switch (variableName) {
                    case 'Total Energy':     value = parseFloat(cols[csvColumns.total_energy_eV]); break;
                    case 'Potential Energy':  value = parseFloat(cols[csvColumns.potential_energy_eV]); break;
                    case 'Kinetic Energy':   value = parseFloat(cols[csvColumns.kinetic_energy_eV]); break;
                    case 'Temperature':      value = parseFloat(cols[csvColumns.temperature_K]); break;
                    case 'Pressure':         value = parseFloat(cols[csvColumns.pressure_bar]); break;
                    case 'Density':          value = parseFloat(cols[csvColumns.density_g_cm3]); break;
                    default:                 value = NaN;
                }

                const color = csvPhaseColors[phase] || 'rgba(128, 128, 128, 1)';
                if (!isNaN(time) && !isNaN(value)) {
                    xData.push(time);
                    variableData.push(value);
                    colors.push(color);
                }
            }
        } else {
            let insideData = false;
            let currentPhase = 'minimization';

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
                } else if (line.includes('NPT dynamics to cool system')) {
                    currentPhase = 'cooling';
                } else if (line.includes('NVT dynamics for equilibration')) {
                    currentPhase = 'final_equilibration';
                } else if (line.includes('NVT dynamics to heat system')) {
                    currentPhase = 'heating';
                } else if (line.includes('NPT dynamics with an isotropic pressure of 1atm.')) {
                    currentPhase = 'pressure_equilibration_1';
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
                    if (step < 100){
                        return;
                    }
                    let variableValue = parseFloat(columns[variableIndex]);

                    let color = phaseColors[currentPhase];

                    if (!isNaN(step) && !isNaN(variableValue)) {
                        xData.push(step);
                        variableData.push(variableValue);
                        colors.push(color);
                    }
                }
            });
        }

        return { xData, variableData, colors };
    }, [log, variableIndex, variableName, isCSV, phaseColors]);

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

    const mean = variableData.length > 0 ? variableData.reduce((acc, val) => acc + val, 0) / variableData.length : 0;
    const stdDev = variableData.length > 0 ? Math.sqrt(variableData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / variableData.length) : 0;
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

    const xLabel = isCSV ? 'Time' : 'Step';
    const segmentColor = (ctx) => visibleColorsSlice[ctx.p0DataIndex] || 'rgba(0, 0, 0, 0.2)';

    const data = {
        labels: visibleXSlice,
        datasets: [
            {
                label: `${xLabel} vs ${variableName} (${isSmooth ? 'Smooth' : 'Raw'})`,
                data: visibleVariableDataSlice,
                pointBackgroundColor: visibleColorsSlice,
                pointRadius: 1.5,
                borderColor: 'rgba(0, 0, 0, 0.2)',
                borderWidth: 2,
                segment: { borderColor: segmentColor },
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
                    <Line data={data} options={options(variableName, variableUnit, plotType, isCSV)} />
                </Col>
            </Row>
        </Container>
    );
}
