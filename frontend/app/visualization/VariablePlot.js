'use client'

import React, { useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { Line } from "react-chartjs-2";
import regression from 'regression';

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
                bottom: 30
            }
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
                }
            }
        },
        y: {
            title: {
                display: true,
                text: `${variableName} (${variableUnit})`,
                font: {
                    size: 14,
                }
            }
        }
    },
    responsive: true,
    animation: false,
});

export default function VariablePlot({ log, sliderValue, variableIndex, variableName, variableUnit }) {
    const [maxSteps, setMaxSteps] = useState(100);

    let steps = [];
    let variableData = [];
    let colors = [];
    let insideData = false;
    let currentPhase = 'minimization';

    const minimizationColor = 'rgba(54, 162, 235, 1)';
    const heatingColor = 'rgba(255, 99, 132, 1)';

    // Process the log data
    log.split('\n').forEach(line => {
        if (line.includes("500 steps CG Minimization")) {
            currentPhase = 'minimization';
        } else if (line.includes("NVT dynamics to heat system")) {
            currentPhase = 'heating';
        }

        if (line.includes("Step")) {
            insideData = true;
            return;
        }
        if (insideData && (line.includes("SHAKE") || line.includes("Bond"))) {
            return;
        }
        if (insideData && line.includes("Loop time of")) {
            insideData = false;
            return;
        }
        if (insideData) {
            let columns = line.trim().split(/\s+/);
            let step = parseInt(columns[0]);
            if (step <= 2500) return;  // TODO: Make a function that detects and removes fluctuations.
            let variableValue = parseFloat(columns[variableIndex]);

            let color = currentPhase === 'minimization' ? minimizationColor : heatingColor;

            steps.push(step);
            variableData.push(variableValue);
            colors.push(color);
        }
    });

    useEffect(() => {
        setMaxSteps(steps.length);
    }, [steps]);

    const visibleVariableData = variableData.slice(0, sliderValue * maxSteps / 100);
    const visibleSteps = steps.slice(0, sliderValue * maxSteps / 100);
    const visibleColors = colors.slice(0, sliderValue * maxSteps / 100);

    const coords = visibleSteps.map((el, index) => [el, visibleVariableData[index]]);
    const polynomialRegression = regression.polynomial(coords, { order: 1, precision: 5 });
    const polynomialFitData = polynomialRegression.points.map(([x, y]) => ({ x, y }));

    const data = {
        labels: visibleSteps,
        datasets: [
            {
                label: `Step vs ${variableName}`,
                data: visibleVariableData,
                pointBackgroundColor: visibleColors,
                borderColor: "rgba(0, 0, 0, 0.1)",
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
        <div style={{ height: '100%', width: '100%' }}>
            <Line data={data} options={options(variableName, variableUnit)} />
        </div>
    );
}
