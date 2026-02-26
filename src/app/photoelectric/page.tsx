'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data, Shape} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500}/>),
});

const H_EV_S = 4.135667696e-15;

export default function Page() {
    const [workFunction, setWorkFunction] = React.useState<number>(2.2);
    const [frequency, setFrequency] = React.useState<number>(6e14);

    const thresholdFrequency = React.useMemo(() => workFunction / H_EV_S, [workFunction]);

    const rawEk = React.useMemo(() => H_EV_S * frequency - workFunction, [frequency, workFunction]);
    const hasPhotoelectron = rawEk > 0;
    const ek = hasPhotoelectron ? rawEk : 0;

    const nuMin = 3e14;
    const nuMax = 9e14;

    const graphNu = React.useMemo(() => {
        const points = 160;
        const step = (nuMax - nuMin) / (points - 1);
        return Array.from({length: points}, (_, idx) => nuMin + idx * step);
    }, []);

    const graphEkLine = React.useMemo(
        () => graphNu.map((nu) => H_EV_S * nu - workFunction),
        [graphNu, workFunction],
    );

    const graphEkPhysical = React.useMemo(
        () => graphNu.map((nu) => Math.max(H_EV_S * nu - workFunction, 0)),
        [graphNu, workFunction],
    );

    const yMax = Math.max(0.5, ...graphEkPhysical, ek) * 1.2;
    const yMin = -0.8;

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphEkLine,
            line: {color: '#94a3b8', width: 2, dash: 'dot'},
            name: '理论直线 hν-W',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphEkPhysical,
            line: {color: '#2563eb', width: 3},
            name: 'Ek(仅ν>ν0)',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [frequency],
            y: [ek],
            marker: {size: 10, color: hasPhotoelectron ? '#16a34a' : '#dc2626'},
            text: [hasPhotoelectron ? '当前点' : '无光电子'],
            textposition: 'top center',
            name: '当前频率',
        },
    ];

    const shapes: Partial<Shape>[] = [
        {
            type: 'line',
            x0: thresholdFrequency,
            x1: thresholdFrequency,
            y0: yMin,
            y1: yMax,
            line: {color: '#ef4444', width: 2, dash: 'dash' as const},
        },
    ];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[30rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="逸出功 W (eV)" variant="outlined" className="w-52"/>
                            <Slider
                                min={1}
                                max={5}
                                value={workFunction}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setWorkFunction(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1, label: '1'}, {value: 5, label: '5'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="频率 ν (Hz)" variant="outlined" className="w-52"/>
                            <Slider
                                min={nuMin}
                                max={nuMax}
                                value={frequency}
                                step={1e13}
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${(value / 1e14).toFixed(1)}e14`}
                                onChange={(_event, newValue) => setFrequency(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: nuMin, label: '3e14'}, {value: nuMax, label: '9e14'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="最大初动能 Ek (eV)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={ek.toFixed(4)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="是否有光电子" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={hasPhotoelectron ? '有' : '无'}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="阈频 ν0 (Hz)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={thresholdFrequency.toExponential(3)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={traces}
                            layout={{
                                width: 860,
                                height: 500,
                                margin: {t: 24, l: 56, r: 24, b: 52},
                                xaxis: {
                                    title: {text: '频率 ν (Hz)'},
                                    range: [nuMin, nuMax],
                                    fixedrange: true,
                                },
                                yaxis: {
                                    title: {text: 'Ek (eV)'},
                                    range: [yMin, yMax],
                                    fixedrange: true,
                                },
                                shapes,
                                annotations: [
                                    {
                                        x: thresholdFrequency,
                                        y: yMax * 0.9,
                                        text: `阈频 ν0=${thresholdFrequency.toExponential(2)} Hz`,
                                        showarrow: true,
                                        arrowhead: 2,
                                        ax: 36,
                                        ay: -20,
                                        bgcolor: 'rgba(255,255,255,0.82)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                ],
                                showlegend: true,
                                legend: {orientation: 'h', x: 0.02, y: 1.08},
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
