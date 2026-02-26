'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={840} height={500}/>),
});

export default function Page() {
    const [intensity, setIntensity] = React.useState<number>(0.5);
    const [frequency, setFrequency] = React.useState<number>(6.2e14);

    const nuMin = 3e14;
    const nu0 = 5e14;
    const nuMax = 9e14;

    const responseCoeff = 10;
    const hasPhotoelectron = frequency > nu0;
    const is = hasPhotoelectron ? responseCoeff * intensity : 0;

    const iLine = React.useMemo(() => {
        const points = 120;
        return Array.from({length: points}, (_, idx) => idx / (points - 1));
    }, []);

    const isLine = React.useMemo(
        () => iLine.map((i) => (hasPhotoelectron ? responseCoeff * i : 0)),
        [iLine, hasPhotoelectron],
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: iLine,
            y: isLine,
            line: {color: '#2563eb', width: 3},
            name: hasPhotoelectron ? 'Is ∝ I' : 'ν≤ν0，Is≈0',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [intensity],
            y: [is],
            marker: {size: 10, color: hasPhotoelectron ? '#16a34a' : '#dc2626'},
            text: ['当前点'],
            textposition: 'top center',
            name: '实时打点',
        },
    ];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[29rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="光强 I" variant="outlined" className="w-52"/>
                            <Slider
                                min={0}
                                max={1}
                                value={intensity}
                                step={0.01}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setIntensity(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: '0'}, {value: 1, label: '1'}]}
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
                                marks={[{value: nuMin, label: '3e14'}, {value: nu0, label: 'ν0'}, {value: nuMax, label: '9e14'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="饱和光电流 Is (a.u.)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={is.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="阈频条件" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={hasPhotoelectron ? 'ν > ν0，满足出射' : 'ν ≤ ν0，无光电子'}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="阈频 ν0 (Hz)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={nu0.toExponential(2)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={traces}
                            layout={{
                                width: 840,
                                height: 500,
                                margin: {t: 24, l: 58, r: 24, b: 52},
                                xaxis: {
                                    title: {text: '光强 I'},
                                    range: [0, 1],
                                    fixedrange: true,
                                },
                                yaxis: {
                                    title: {text: '饱和光电流 Is (a.u.)'},
                                    range: [0, responseCoeff * 1.15],
                                    fixedrange: true,
                                },
                                annotations: [
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.98,
                                        text: hasPhotoelectron
                                            ? `ν=${frequency.toExponential(2)}Hz > ν0，Is 与 I 成正比`
                                            : `ν=${frequency.toExponential(2)}Hz ≤ ν0，Is≈0`,
                                        showarrow: false,
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
