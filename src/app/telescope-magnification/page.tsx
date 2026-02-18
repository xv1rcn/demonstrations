'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={900} height={520}/>),
});

export default function Page() {
    const [fObj, setFObj] = React.useState<number>(120);
    const [fEye, setFEye] = React.useState<number>(8);

    const angleInDeg = 0.3;
    const angleInRad = angleInDeg * Math.PI / 180;

    const m = React.useMemo(() => -fObj / fEye, [fObj, fEye]);
    const absM = Math.abs(m);

    const apparentFieldDeg = 50;
    const fieldApprox = React.useMemo(() => apparentFieldDeg / absM, [absM]);

    const scale = 20;
    const xLensObj = 0;
    const xLensEye = (fObj + fEye) / scale;
    const xFocus = fObj / scale;

    const yImage = fObj * Math.tan(angleInRad) / scale;
    const inSlope = Math.tan(angleInRad);
    const outSlope = -absM * inSlope;

    const xMin = -6;
    const xMax = xLensEye + 6;

    const yAtObjLens = [-0.9, -0.45, 0, 0.45, 0.9];

    const rayGroups = yAtObjLens.map((yAtLens) => {
        const yAtMin = yAtLens + (xMin - xLensObj) * inSlope;
        const slopeAfterObj = (yImage - yAtLens) / (xFocus - xLensObj);
        const yAtEye = yAtLens + (xLensEye - xLensObj) * slopeAfterObj;
        const yAtMax = yAtEye + (xMax - xLensEye) * outSlope;
        return {yAtMin, yAtLens, yAtEye, yAtMax};
    });

    const ySamples = [
        0,
        ...rayGroups.flatMap((r) => [r.yAtMin, r.yAtLens, r.yAtEye, r.yAtMax]),
        yImage,
    ];
    const yAbsMax = Math.max(1.4, ...ySamples.map((v) => Math.abs(v)));
    const yMin = -1.2 * yAbsMax;
    const yMax = 1.2 * yAbsMax;

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: [xMin, xMax],
            y: [0, 0],
            line: {color: '#111827', width: 2},
            name: '主光轴',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [xFocus],
            y: [yImage],
            marker: {size: 8, color: '#111827'},
            text: ['中间焦平面像点'],
            textposition: yImage >= 0 ? 'top center' : 'bottom center',
            name: '中间像点',
        },
        ...rayGroups.flatMap((ray, idx) => {
            const showLegend = idx === 0;
            return [
                {
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    x: [xMin, xLensObj],
                    y: [ray.yAtMin, ray.yAtLens],
                    line: {color: '#10b981', width: 2.6},
                    name: showLegend ? '入射平行光' : undefined,
                    showlegend: showLegend,
                },
                {
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    x: [xLensObj, xLensEye],
                    y: [ray.yAtLens, ray.yAtEye],
                    line: {color: '#f59e0b', width: 2.6},
                    name: showLegend ? '物镜后会聚光' : undefined,
                    showlegend: showLegend,
                },
                {
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    x: [xLensEye, xMax],
                    y: [ray.yAtEye, ray.yAtMax],
                    line: {color: '#2563eb', width: 2.6},
                    name: showLegend ? '目镜后出射平行光' : undefined,
                    showlegend: showLegend,
                },
            ];
        }),
    ];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[29rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="物镜焦距 f物 (mm)" variant="outlined" className="w-52"/>
                            <Slider
                                min={50}
                                max={200}
                                value={fObj}
                                step={1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setFObj(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 50, label: '50'}, {value: 200, label: '200'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="目镜焦距 f目 (mm)" variant="outlined" className="w-52"/>
                            <Slider
                                min={2}
                                max={15}
                                value={fEye}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setFEye(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 2, label: '2'}, {value: 15, label: '15'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="角放大倍率 |M|" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={absM.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="视场粗略值 (°)" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={fieldApprox.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="角放大率 M" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={m.toFixed(3)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={traces}
                            layout={{
                                width: 900,
                                height: 520,
                                margin: {t: 24, l: 24, r: 24, b: 24},
                                xaxis: {range: [xMin, xMax], visible: false, fixedrange: true},
                                yaxis: {range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1},
                                shapes: [
                                    {
                                        type: 'line',
                                        x0: xLensObj,
                                        x1: xLensObj,
                                        y0: yMin * 0.75,
                                        y1: yMax * 0.75,
                                        line: {color: '#64748b', width: 4},
                                    },
                                    {
                                        type: 'line',
                                        x0: xLensEye,
                                        x1: xLensEye,
                                        y0: yMin * 0.75,
                                        y1: yMax * 0.75,
                                        line: {color: '#64748b', width: 4},
                                    },
                                ],
                                annotations: [
                                    {
                                        x: xLensObj,
                                        y: yMax * 0.86,
                                        text: '物镜',
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        x: xLensEye,
                                        y: yMax * 0.86,
                                        text: '目镜',
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.01,
                                        y: 0.98,
                                        text: `M=-f物/f目=${m.toFixed(2)}；|M|=${absM.toFixed(2)}；视场≈${fieldApprox.toFixed(2)}°`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.8)',
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
