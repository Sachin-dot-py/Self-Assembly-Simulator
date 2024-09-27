'use client'

import React, { useEffect, useState } from 'react';
import Chart from 'chart.js/auto';
import { Line } from "react-chartjs-2";
import regression from 'regression';

const options = {
    plugins: {
        title: {
            text: "Total Energy",
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
                text: 'Total Energy',
                font: {
                    size: 14,
                }
            }
        }
    },
    responsive: true,
    animation: false,
    // maintainAspectRatio: false,
};

// Chart.register(annotationPlugin);
// Chart.register('chartjs-plugin-regression');

export default function EnergyPlot({ visualId, sliderValue }) { // Accept sliderValue as a prop
    const [log, setLog] = useState('');
    const [maxSteps, setMaxSteps] = useState(100);

    let steps = [];
    let totalEnergy = [];
    let insideData = false;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch('/api/getfiles/' + visualId);
                const data = await response.json();
                const content = data.log;
                setLog(content);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, [visualId]);

    log.split('\n').forEach(line => {
        if (line.includes("Step          Time")) {
            insideData = true;
            return;
        }
        if (insideData && line.includes("Loop time of")) {
            insideData = false;
            return;
        }
        if (insideData) {
            let columns = line.trim().split(/\s+/);
            let step = parseInt(columns[0]);
            let energy = parseFloat(columns[2]);
            steps.push(step);
            totalEnergy.push(energy);
        }
    });

    useEffect(() => {
        setMaxSteps(steps.length);
    }, [steps]);

    const visibleEnergy = totalEnergy.slice(0, sliderValue*maxSteps/100);
    const visibleSteps = steps.slice(0, sliderValue*maxSteps/100);

    const coords = visibleSteps.map((el, index) => [el, visibleEnergy[index]]);
    const polynomialRegression = regression.polynomial(coords, { order: 4, precision: 6 });
    const polynomialFitData = polynomialRegression.points.map(([x, y]) => ({ x, y }));

    const data = {
        labels: visibleSteps,
        datasets: [
            {
                label: "Step vs Total Energy",
                backgroundColor: "rgba(54, 162, 235, 0.5)",
                borderColor: "rgba(54, 162, 235, 1)",
                data: visibleEnergy,
                tension: 0.4,
                order: 1
            },
            {
                label: "Polynomial Fit",
                backgroundColor: "rgba(255, 99, 132, 0.5)",
                borderColor: "rgba(255, 99, 132, 1)",
                data: polynomialFitData.map(point => point.y),
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
            <Line data={data} options={options} />
        </div>
    );
}

