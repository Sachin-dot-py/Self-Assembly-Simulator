import React, { useState, useMemo } from 'react';
import 'chart.js/auto';
import { Line } from 'react-chartjs-2';
import { Form, Container, Row, Col } from 'react-bootstrap';

const THERMO_INDEX_TO_KEY = {
    1: 'temp',
    2: 'press',
    3: 'pe',
    4: 'ke',
    5: 'etotal',
    6: 'evdwl',
    7: 'ecoul',
    8: 'epair',
    9: 'ebond',
    10: 'eangle',
    11: 'edihed',
    12: 'eimp',
    13: 'emol',
    14: 'elong',
    15: 'etail',
    16: 'enthalpy',
    17: 'ecouple',
    18: 'econserve',
    19: 'vol',
    20: 'density',
};

const MULTI_THERMO_KEY_MAP = {
    temp: 'Temp',
    press: 'Press',
    pe: 'PotEng',
    ke: 'KinEng',
    etotal: 'TotEng',
    evdwl: 'E_vdwl',
    ecoul: 'E_coul',
    ebond: 'E_bond',
    eangle: 'E_angle',
    edihed: 'E_dihed',
    eimp: 'E_impro',
    elong: 'E_long',
};

const PHASES_BY_PLOT_TYPE = {
    ionic: {
        minimization: {
            label: 'Algorithm minimization',
            color: 'rgba(128, 128, 128, 1)',
            markers: ['500 steps CG Minimization'],
        },
        heating_1: {
            label: 'Heat (constant V) to room temperature',
            color: 'rgba(255, 69, 0, 1)',
            markers: ['NVT dynamics to heat system x1'],
        },
        pressure_equilibration_1: {
            label: 'Maintain (constant P) at room temperature',
            color: 'rgba(30, 144, 255, 1)',
            markers: ['NPT dynamics with an isotropic pressure of 1atm. x1'],
        },
        heating_2: {
            label: 'Heat/anneal (constant V) to 1000K',
            color: 'rgba(255, 140, 0, 1)',
            markers: ['NVT dynamics to heat system x2'],
        },
        pressure_equilibration_2: {
            label: 'Maintain (constant P) at 1000K',
            color: 'rgba(100, 149, 237, 1)',
            markers: ['NPT dynamics with an isotropic pressure of 1atm. x2'],
        },
        cooling: {
            label: 'Cool (constant P) to room temperature',
            color: 'rgba(0, 191, 255, 1)',
            markers: ['NPT dynamics to cool system'],
        },
        final_equilibration: {
            label: 'Equilibrate (constant V) at room temperature',
            color: 'rgba(144, 238, 144, 1)',
            markers: ['NVT dynamics for equilibration'],
        },
    },
    gold: {
        minimization: {
            label: 'Algorithm minimization',
            color: 'rgba(128, 128, 128, 1)',
            markers: ['500 steps CG Minimization', '#now                 minimize the entire system'],
        },
        heating: {
            label: 'Heat (constant V) to room temperature',
            color: 'rgba(255, 99, 71, 1)',
            markers: ['NVT dynamics to heat system'],
        },
        pressure_equilibration_1: {
            label: 'Maintain (constant P) at room temperature',
            color: 'rgba(30, 144, 255, 1)',
            markers: ['NPT dynamics with an isotropic pressure of 1atm.'],
        },
    },
};

const options = (variableName, variableUnit, phaseLegend) => ({
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
            display: phaseLegend.length > 0,
            position: 'top',
            labels: {
                generateLabels: () => {
                    return phaseLegend.map((phase) => ({
                        text: phase.label,
                        fillStyle: phase.color,
                        strokeStyle: phase.color,
                    }));
                },
            },
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

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit, plotType="gold" }) {
    const [isSmooth, setIsSmooth] = useState(true);
    const phaseConfig = PHASES_BY_PLOT_TYPE[plotType] || PHASES_BY_PLOT_TYPE.gold;

    const { steps, variableData, colors, phasesPresent } = useMemo(() => {
        const steps = [];
        const variableData = [];
        const colors = [];
        const phasesPresent = new Set();
        const targetKey = THERMO_INDEX_TO_KEY[variableIndex];
        const multiTargetKey = MULTI_THERMO_KEY_MAP[targetKey];

        let insideCustomData = false;
        let insideMultiData = false;
        let currentPhase = 'minimization';
        let pendingMultiRecord = null;

        const pushPoint = (step, variableValue) => {
            if (Number.isNaN(step) || Number.isNaN(variableValue) || step < 100) {
                return;
            }

            const phase = phaseConfig[currentPhase] || phaseConfig.minimization;
            steps.push(step);
            variableData.push(variableValue);
            colors.push(phase.color);
            phasesPresent.add(currentPhase);
        };

        const finalizeMultiRecord = () => {
            if (!pendingMultiRecord || !multiTargetKey) {
                pendingMultiRecord = null;
                return;
            }

            const variableValue = parseFloat(pendingMultiRecord[multiTargetKey]);
            pushPoint(pendingMultiRecord.step, variableValue);
            pendingMultiRecord = null;
        };

        log.split('\n').forEach((line) => {
            const matchingPhaseKey = Object.entries(phaseConfig).find(([, phase]) =>
                phase.markers.some((marker) => line.includes(marker))
            )?.[0];

            if (matchingPhaseKey) {
                currentPhase = matchingPhaseKey;
            }

            if (line.startsWith('------------ Step')) {
                finalizeMultiRecord();
                insideMultiData = true;
                insideCustomData = false;

                const stepMatch = line.match(/Step\s+(-?\d+)/);
                pendingMultiRecord = stepMatch ? { step: parseInt(stepMatch[1], 10) } : null;
                return;
            }

            if (insideMultiData) {
                if (line.includes('Loop time of')) {
                    finalizeMultiRecord();
                    insideMultiData = false;
                    return;
                }

                const entries = [...line.matchAll(/([A-Za-z_]+)\s*=\s*([-\d.+Ee]+)/g)];
                if (pendingMultiRecord && entries.length > 0) {
                    entries.forEach(([, key, value]) => {
                        pendingMultiRecord[key] = value;
                    });
                }
                return;
            }

            if (line.trim().startsWith('Step')) {
                insideCustomData = true;
                return;
            }

            if (insideCustomData && line.includes('Loop time of')) {
                insideCustomData = false;
                return;
            }

            if (insideCustomData && (line.includes('SHAKE') || line.startsWith('Bond:'))) {
                return;
            }

            if (insideCustomData) {
                const columns = line.trim().split(/\s+/);
                const step = parseInt(columns[0], 10);
                const variableValue = parseFloat(columns[variableIndex]);
                pushPoint(step, variableValue);
            }
        });

        finalizeMultiRecord();

        return { steps, variableData, colors, phasesPresent };
    }, [log, phaseConfig, variableIndex]);

    const phaseLegend = useMemo(() => {
        return Object.entries(phaseConfig)
            .filter(([phaseKey]) => phasesPresent.has(phaseKey))
            .map(([, phase]) => ({ label: phase.label, color: phase.color }));
    }, [phaseConfig, phasesPresent]);

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

    const mean = variableData.length > 0
        ? variableData.reduce((acc, val) => acc + val, 0) / variableData.length
        : 0;
    const stdDev = variableData.length > 0
        ? Math.sqrt(variableData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / variableData.length)
        : 0;
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

    const smoothData = isSmooth && filteredData.variableData.length > 0
        ? gaussianSmooth(filteredData.variableData)
        : filteredData.variableData;

    const filteredSteps = filteredData.steps;
    const filteredColors = filteredData.colors;

    const maxVisibleIndex = Math.floor((sliderValue / 100) * filteredSteps.length);
    const visibleVariableDataSlice = smoothData.slice(0, maxVisibleIndex);
    const visibleStepsSlice = filteredSteps.slice(0, maxVisibleIndex);
    const visibleColorsSlice = filteredColors.slice(0, maxVisibleIndex);

    // const coords = visibleStepsSlice.map((el, index) => [el, visibleVariableDataSlice[index]]);
    // const polynomialRegression = regression.polynomial(coords, { order: 1, precision: 5 });
    // const polynomialFitData = polynomialRegression.points.map(([x, y]) => ({ x, y }));

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
            // {
            //     label: "Polynomial Fit",
            //     data: polynomialFitData.map(point => point.y),
            //     borderColor: "rgba(64, 64, 64, 1)",
            //     borderDash: [5, 5],
            //     fill: false,
            //     pointRadius: 0,
            //     tension: 0.4,
            //     order: 0
            // }
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
                    <Line data={data} options={options(variableName, variableUnit, phaseLegend)} />
                </Col>
            </Row>
        </Container>
    );
}
