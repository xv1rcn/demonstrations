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

    const nuMin = 4e14;
    const nuMax = 9e14;

    const uRaw = React.useMemo(() => H_EV_S * frequency - workFunction, [frequency, workFunction]);
    const uc = Math.max(0, uRaw);

    const graphNu = React.useMemo(() => {
        const points = 140;
        const step = (nuMax - nuMin) / (points - 1);
        return Array.from({length: points}, (_, idx) => nuMin + idx * step);
    }, []);

    const graphLine = React.useMemo(
        () => graphNu.map((nu) => H_EV_S * nu - workFunction),
        [graphNu, workFunction],
    );

    const yMin = Math.min(-5.5, ...graphLine) * 1.05;
    const yMax = Math.max(1.2, ...graphLine, uc) * 1.15;

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphLine,
            line: {color: '#2563eb', width: 3},
            name: 'Uc = (h/e)ν - W/e',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [frequency],
            y: [uRaw],
            marker: {size: 9, color: uRaw >= 0 ? '#16a34a' : '#dc2626'},
            text: [uRaw >= 0 ? '当前 Uc' : '当前点(未出射)'],
            textposition: 'top center',
            name: '当前频率',
        },
    ];

    const shapes: Partial<Shape>[] = [
        {
            type: 'line',
            x0: nuMin,
            x1: nuMax,
            y0: 0,
            y1: 0,
            line: {color: '#94a3b8', width: 1.5, dash: 'dot' as const},
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
                                marks={[{value: nuMin, label: '4e14'}, {value: nuMax, label: '9e14'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="遏止电压 Uc (V)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={uc.toFixed(4)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="线性式截距" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={`-W/e = -${workFunction.toFixed(3)} V`}/>
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
                                margin: {t: 24, l: 58, r: 24, b: 52},
                                xaxis: {title: '频率 ν (Hz)', range: [nuMin, nuMax], fixedrange: true},
                                yaxis: {title: '遏止电压 Uc (V)', range: [yMin, yMax], fixedrange: true},
                                shapes,
                                annotations: [
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.98,
                                        text: `Uc=(h/e)ν-W/e，纵截距=-W/e=-${workFunction.toFixed(2)}V`,
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
