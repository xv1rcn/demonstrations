'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={760} height={460}/>)},
);

export default function Page() {
    const [f0, setF0] = React.useState<number>(120);
    const [nr, setNr] = React.useState<number>(1.52);
    const [nb, setNb] = React.useState<number>(1.55);

    const nRef = 1.52;

    const fRed = React.useMemo(() => f0 * (nRef - 1) / (nr - 1), [f0, nr]);
    const fBlue = React.useMemo(() => f0 * (nRef - 1) / (nb - 1), [f0, nb]);
    const deltaF = React.useMemo(() => Math.abs(fRed - fBlue), [fRed, fBlue]);

    const scale = 40;
    const fRedPlot = fRed / scale;
    const fBluePlot = fBlue / scale;

    const leftX = -3.8;
    const lensX = 0;
    const yRays = [0.7, 0.35, -0.35, -0.7];

    const redRays: Data[] = yRays.flatMap((y) => ([
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [leftX, lensX],
            y: [y, y],
            line: {color: 'rgba(220,38,38,0.5)', width: 2},
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [lensX, fRedPlot],
            y: [y, 0],
            line: {color: 'rgba(220,38,38,0.85)', width: 2.5},
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
    ]));

    const blueRays: Data[] = yRays.flatMap((y) => ([
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [leftX, lensX],
            y: [y + 0.08, y + 0.08],
            line: {color: 'rgba(37,99,235,0.45)', width: 2},
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [lensX, fBluePlot],
            y: [y + 0.08, 0],
            line: {color: 'rgba(37,99,235,0.85)', width: 2.5},
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
    ]));

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[28rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="基准焦距 f0 (mm)" variant="outlined" className="w-48"/>
                            <Slider
                                min={50} max={200} value={f0} step={1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setF0(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 50, label: '50'}, {value: 200, label: '200'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="红光折射率 nr" variant="outlined" className="w-48"/>
                            <Slider
                                min={1.50} max={1.55} value={nr} step={0.001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setNr(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1.50, label: '1.50'}, {value: 1.55, label: '1.55'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="蓝光折射率 nb" variant="outlined" className="w-48"/>
                            <Slider
                                min={1.53} max={1.58} value={nb} step={0.001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setNb(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1.53, label: '1.53'}, {value: 1.58, label: '1.58'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="f 红 (mm)" variant="outlined" className="w-48"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={fRed.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="f 蓝 (mm)" variant="outlined" className="w-48"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={fBlue.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="色差 Δf (mm)" variant="outlined" className="w-48"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={deltaF.toFixed(3)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [leftX, 5.2],
                                    y: [0, 0],
                                    line: {color: '#111827', width: 2},
                                    name: '主光轴',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'text+markers',
                                    x: [fRedPlot],
                                    y: [0],
                                    marker: {size: 10, color: '#dc2626'},
                                    text: [`f红=${fRed.toFixed(1)}mm`],
                                    textposition: 'top center',
                                    name: '红光焦点',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'text+markers',
                                    x: [fBluePlot],
                                    y: [0],
                                    marker: {size: 10, color: '#2563eb'},
                                    text: [`f蓝=${fBlue.toFixed(1)}mm`],
                                    textposition: 'bottom center',
                                    name: '蓝光焦点',
                                },
                                ...redRays,
                                ...blueRays,
                            ]}
                            layout={{
                                width: 780,
                                height: 470,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                xaxis: {range: [-4.1, 5.4], visible: false, fixedrange: true},
                                yaxis: {range: [-1.6, 1.6], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1},
                                shapes: [
                                    {
                                        type: 'line',
                                        x0: lensX,
                                        x1: lensX,
                                        y0: -1.2,
                                        y1: 1.2,
                                        line: {color: '#64748b', width: 4},
                                    },
                                    {
                                        type: 'line',
                                        x0: fRedPlot,
                                        x1: fBluePlot,
                                        y0: -0.16,
                                        y1: -0.16,
                                        line: {color: '#111827', width: 2, dash: 'dot'},
                                    },
                                ],
                                annotations: [
                                    {
                                        x: lensX,
                                        y: 1.35,
                                        text: '透镜',
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        x: (fRedPlot + fBluePlot) / 2,
                                        y: -0.28,
                                        text: `Δf=${deltaF.toFixed(2)}mm`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
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
