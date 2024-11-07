import React, { useEffect, useState, useMemo } from 'react';
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

    const minimizationColor = 'rgba(54, 162, 235, 1)';
    const heatingColor = 'rgba(255, 99, 132, 1)';

    // Wrap steps and variableData in useMemo to prevent re-initialization on every render
    const { steps, variableData, colors } = useMemo(() => {
        let steps = [];
        let variableData = [];
        let colors = [];
        let insideData = false;
        let currentPhase = 'minimization';

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

        return { steps, variableData, colors };
    }, [log, variableIndex, minimizationColor, heatingColor]);

    useEffect(() => {
        setMaxSteps(steps.length);
    }, [steps]);

    // Filtering NaN values
    const filteredData = steps.reduce((acc, step, index) => {
        if (!isNaN(step) && !isNaN(variableData[index])) {
            acc.steps.push(step);
            acc.variableData.push(variableData[index]);
            acc.colors.push(colors[index]);
        }
        return acc;
    }, { steps: [], variableData: [], colors: [] });

    const { steps: filteredSteps, variableData: filteredVariableData, colors: filteredColors } = filteredData;

    // Calculate the mean and standard deviation
    const mean = filteredVariableData.reduce((acc, val) => acc + val, 0) / filteredVariableData.length;
    const stdDev = Math.sqrt(filteredVariableData.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / filteredVariableData.length);

    // Set a clipping threshold at mean ± 1 * stdDev (can adjust this factor if needed)
    const lowerBound = mean - 1 * stdDev;
    const upperBound = mean + 1 * stdDev;

    // Filter data to remove outliers based on this threshold
    const visibleVariableData = filteredVariableData.filter((value, index) => value >= lowerBound && value <= upperBound);
    const visibleSteps = filteredSteps.filter((_, index) => filteredVariableData[index] >= lowerBound && filteredVariableData[index] <= upperBound);
    const visibleColors = filteredColors.filter((_, index) => filteredVariableData[index] >= lowerBound && filteredVariableData[index] <= upperBound);

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
