'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={920} height={540}/>),
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function Page() {
    const [fObj, setFObj] = React.useState<number>(5);
    const [fEye, setFEye] = React.useState<number>(12);
    const [uObj, setUObj] = React.useState<number>(7);

    const uMin = React.useMemo(() => Number((fObj + 0.5).toFixed(1)), [fObj]);
    const uMax = React.useMemo(() => Number((fObj + 10).toFixed(1)), [fObj]);

    React.useEffect(() => {
        setUObj((prev) => clamp(prev, uMin, uMax));
    }, [uMin, uMax]);

    const vObj = React.useMemo(() => (fObj * uObj) / (uObj - fObj), [fObj, uObj]);
    const mObj = React.useMemo(() => -vObj / uObj, [vObj, uObj]);

    const uEye = React.useMemo(() => 0.8 * fEye, [fEye]);
    const lens2X = React.useMemo(() => vObj + uEye, [vObj, uEye]);

    const vEye = React.useMemo(() => (fEye * uEye) / (uEye - fEye), [fEye, uEye]);
    const mEyeLinear = React.useMemo(() => -vEye / uEye, [vEye, uEye]);

    const mEye = React.useMemo(() => 250 / fEye, [fEye]);
    const mTotal = React.useMemo(() => Math.abs(mObj) * mEye, [mObj, mEye]);

    const yObjectTop = 1.0;

    const xObj = -uObj;
    const xLens1 = 0;
    const xInter = vObj;
    const yInter = mObj * yObjectTop;

    const xLens2 = lens2X;
    const xFinal = xLens2 + vEye;
    const yFinal = mEyeLinear * yInter;

    const xRight = xLens2 + 0.35 * Math.max(40, xLens2 - xObj);

    const yRay1AtRight = yInter + (xRight - xLens2) * (yInter / fEye);
    const slopeCenterEye = (0 - yInter) / (xLens2 - xInter);
    const yRay2AtRight = (xRight - xLens2) * slopeCenterEye;

    const xValues = [xObj, xLens1, xInter, xLens2, xFinal, xRight];
    const yValues = [0, yObjectTop, yInter, yFinal, yRay1AtRight, yRay2AtRight];

    const xMin = Math.min(...xValues) - 6;
    const xMax = Math.max(...xValues) + 6;
    const yAbsMax = Math.max(1.8, ...yValues.map((v) => Math.abs(v)));
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
            mode: 'text+lines',
            x: [xObj, xObj],
            y: [0, yObjectTop],
            line: {color: '#111827', width: 4},
            text: ['', '物'],
            textposition: yObjectTop >= 0 ? 'top center' : 'bottom center',
            name: '物体',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xInter, xInter],
            y: [0, yInter],
            line: {color: '#374151', width: 4},
            text: ['', '中间实像'],
            textposition: yInter >= 0 ? 'top center' : 'bottom center',
            name: '中间像',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xFinal, xFinal],
            y: [0, yFinal],
            line: {color: '#111827', width: 4, dash: 'dot'},
            text: ['', '最终虚像'],
            textposition: yFinal >= 0 ? 'top center' : 'bottom center',
            name: '最终虚像',
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, xLens1],
            y: [yObjectTop, yObjectTop],
            line: {color: '#ef4444', width: 3},
            name: '物镜平行主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens1, xInter],
            y: [yObjectTop, yInter],
            line: {color: '#ef4444', width: 3},
            showlegend: false,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, xLens1],
            y: [yObjectTop, 0],
            line: {color: '#2563eb', width: 3},
            name: '物镜中心主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens1, xInter],
            y: [0, yInter],
            line: {color: '#2563eb', width: 3},
            showlegend: false,
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xInter, xLens2],
            y: [yInter, yInter],
            line: {color: '#f59e0b', width: 3},
            name: '目镜平行主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xRight],
            y: [yInter, yRay1AtRight],
            line: {color: '#f59e0b', width: 3},
            showlegend: false,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xInter, xLens2],
            y: [yInter, 0],
            line: {color: '#0ea5e9', width: 3},
            name: '目镜中心主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xRight],
            y: [0, yRay2AtRight],
            line: {color: '#0ea5e9', width: 3},
            showlegend: false,
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xFinal],
            y: [yInter, yFinal],
            line: {color: '#f59e0b', width: 2, dash: 'dot'},
            name: '反向延长线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xFinal],
            y: [0, yFinal],
            line: {color: '#0ea5e9', width: 2, dash: 'dot'},
            showlegend: false,
        },
    ];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[30rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="物镜焦距 f物 (mm)" variant="outlined" className="w-52"/>
                            <Slider
                                min={2}
                                max={10}
                                value={fObj}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setFObj(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 2, label: '2'}, {value: 10, label: '10'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="目镜焦距 f目 (mm)" variant="outlined" className="w-52"/>
                            <Slider
                                min={5}
                                max={25}
                                value={fEye}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setFEye(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 5, label: '5'}, {value: 25, label: '25'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="物距 u (mm)" variant="outlined" className="w-52"/>
                            <Slider
                                min={uMin}
                                max={uMax}
                                value={uObj}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setUObj(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: uMin, label: `${uMin}`}, {value: uMax, label: `${uMax}`}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="物镜放大率 M物" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={mObj.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="目镜放大率 M目" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={mEye.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="总放大倍率 M" variant="outlined" className="w-52"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={mTotal.toFixed(3)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={traces}
                            layout={{
                                width: 920,
                                height: 540,
                                margin: {t: 24, l: 28, r: 24, b: 24},
                                xaxis: {range: [xMin, xMax], visible: false, fixedrange: true},
                                yaxis: {range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1},
                                shapes: [
                                    {
                                        type: 'line',
                                        x0: xLens1,
                                        x1: xLens1,
                                        y0: yMin * 0.65,
                                        y1: yMax * 0.65,
                                        line: {color: '#64748b', width: 4},
                                    },
                                    {
                                        type: 'line',
                                        x0: xLens2,
                                        x1: xLens2,
                                        y0: yMin * 0.65,
                                        y1: yMax * 0.65,
                                        line: {color: '#64748b', width: 4},
                                    },
                                ],
                                annotations: [
                                    {
                                        x: xLens1,
                                        y: yMax * 0.78,
                                        text: '物镜',
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.8)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        x: xLens2,
                                        y: yMax * 0.78,
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
                                        text: `v物=${vObj.toFixed(2)}mm, v目=${vEye.toFixed(2)}mm（虚像）`,
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
