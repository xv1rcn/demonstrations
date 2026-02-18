'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={840} height={560}/>),
});

type Point = { x: number; y: number };
type Ray = { p: Point; d: Point };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const yAtX = (ray: Ray, x: number) => {
    if (Math.abs(ray.d.x) < 1e-9) return ray.p.y;
    return ray.p.y + (x - ray.p.x) * ray.d.y / ray.d.x;
};

const pointOnRayAtX = (ray: Ray, x: number): Point => ({x, y: yAtX(ray, x)});

export default function Page() {
    const [u, setU] = React.useState<number>(30);
    const [f, setF] = React.useState<number>(10);

    const objectHeight = 1.2;
    const scale = 10;

    const xMin = -16;
    const xMax = 16;
    const yMin = -10;
    const yMax = 10;

    const epsilon = 0.15;
    const nearFocus = Math.abs(u - f) < epsilon;

    const v = React.useMemo(() => {
        if (nearFocus) return Number.POSITIVE_INFINITY;
        return (u * f) / (u - f);
    }, [u, f, nearFocus]);

    const m = React.useMemo(() => {
        if (nearFocus) return Number.POSITIVE_INFINITY;
        return -v / u;
    }, [v, u, nearFocus]);

    const imageType = React.useMemo(() => {
        if (nearFocus) return '实像（近似无穷远）';
        return v > 0 ? '实像' : '虚像';
    }, [nearFocus, v]);

    const imageDistanceText = nearFocus ? '∞' : v.toFixed(3);
    const magnificationText = nearFocus ? '∞' : m.toFixed(3);

    const xObj = -u / scale;
    const yObj = objectHeight;
    const xF = f / scale;

    const xImg = nearFocus ? Number.POSITIVE_INFINITY : v / scale;
    const yImg = nearFocus ? 0 : m * yObj;

    const objectTop: Point = {x: xObj, y: yObj};
    const lensParallelPoint: Point = {x: 0, y: yObj};
    const centerPoint: Point = {x: 0, y: 0};

    const rayParallelOut: Ray = React.useMemo(() => {
        if (nearFocus) {
            return {p: lensParallelPoint, d: {x: 1, y: 0}};
        }
        if (v > 0) {
            return {p: lensParallelPoint, d: {x: xImg - lensParallelPoint.x, y: yImg - lensParallelPoint.y}};
        }
        return {p: lensParallelPoint, d: {x: xF, y: yObj}};
    }, [nearFocus, v, xImg, yImg, xF, yObj]);

    const rayCenterOut: Ray = {
        p: centerPoint,
        d: {x: centerPoint.x - objectTop.x, y: centerPoint.y - objectTop.y},
    };

    const rightEndParallel = pointOnRayAtX(rayParallelOut, xMax);
    const rightEndCenter = pointOnRayAtX(rayCenterOut, xMax);

    const leftExtX = clamp(Number.isFinite(xImg) ? xImg : xMin, xMin, 0);
    const leftExtParallel = pointOnRayAtX(rayParallelOut, leftExtX);
    const leftExtCenter = pointOnRayAtX(rayCenterOut, leftExtX);

    const imageXInRange = Number.isFinite(xImg) && xImg >= xMin && xImg <= xMax;
    const imageYInRange = Number.isFinite(yImg) && yImg >= yMin && yImg <= yMax;
    const imageInView = !nearFocus && imageXInRange && imageYInRange;

    const imageMarkerX = clamp(Number.isFinite(xImg) ? xImg : 0, xMin + 0.2, xMax - 0.2);
    const imageMarkerY = Number.isFinite(yImg)
        ? (yImg > yMax ? yMax - 0.08 : (yImg < yMin ? yMin + 0.08 : yImg))
        : 0;

    const isRealImage = !nearFocus && v > 0;
    const isVirtualImage = !nearFocus && v < 0;

    const virtualExtensionTraces: Data[] = isVirtualImage
        ? [
            {
                type: 'scatter',
                mode: 'lines',
                x: [0, leftExtX],
                y: [yObj, leftExtParallel.y],
                line: {color: '#ef4444', width: 2, dash: 'dot'},
                name: '反向延长线',
            },
            {
                type: 'scatter',
                mode: 'lines',
                x: [0, leftExtX],
                y: [0, leftExtCenter.y],
                line: {color: '#2563eb', width: 2, dash: 'dot'},
                showlegend: false,
            },
        ]
        : [];

    const imageTrace: Data[] = !nearFocus && imageInView
        ? [{
            type: 'scatter',
            mode: 'text+lines',
            x: [xImg, xImg],
            y: [0, yImg],
            line: {color: '#111827', width: 4},
            text: ['', isRealImage ? '像' : '虚像'],
            textposition: yImg >= 0 ? 'top center' : 'bottom center',
            name: '像',
        }]
        : [];

    const overflowImageTrace: Data[] = !nearFocus && !imageInView
        ? [{
            type: 'scatter',
            mode: 'text+markers',
            x: [imageMarkerX],
            y: [imageMarkerY],
            marker: {size: 8, color: '#111827'},
            text: [isRealImage ? '像(超出视窗)' : '虚像(超出视窗)'],
            textposition: imageMarkerY >= 0 ? 'top center' : 'bottom center',
            name: '像',
        }]
        : [];

    const overflowAnnotations = !nearFocus && !imageInView
        ? [
            ...(Number.isFinite(yImg) && yImg > yMax
                ? [{x: imageMarkerX, y: yMax - 0.04, text: '', showarrow: true, ax: 0, ay: 26, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827'}]
                : []),
            ...(Number.isFinite(yImg) && yImg < yMin
                ? [{x: imageMarkerX, y: yMin + 0.04, text: '', showarrow: true, ax: 0, ay: -26, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827'}]
                : []),
            ...(Number.isFinite(xImg) && xImg > xMax
                ? [{x: xMax - 0.04, y: imageMarkerY, text: '', showarrow: true, ax: 26, ay: 0, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827'}]
                : []),
            ...(Number.isFinite(xImg) && xImg < xMin
                ? [{x: xMin + 0.04, y: imageMarkerY, text: '', showarrow: true, ax: -26, ay: 0, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827'}]
                : []),
        ]
        : [];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[27rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="物距 u (cm)" variant="outlined" className="w-44"/>
                            <Slider
                                min={5}
                                max={60}
                                value={u}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setU(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 5, label: '5'}, {value: 60, label: '60'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="焦距 f (cm)" variant="outlined" className="w-44"/>
                            <Slider
                                min={5}
                                max={20}
                                value={f}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setF(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 5, label: '5'}, {value: 20, label: '20'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="像距 v (cm)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={imageDistanceText}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="放大率 m" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={magnificationText}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="像的性质" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={imageType}/>
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
                                    x: [xMin, xMax],
                                    y: [0, 0],
                                    line: {color: '#111827', width: 2},
                                    name: '主光轴',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'text+lines',
                                    x: [xObj, xObj],
                                    y: [0, yObj],
                                    line: {color: '#111827', width: 4},
                                    text: ['', '物'],
                                    textposition: 'top center',
                                    name: '物体',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'text+lines',
                                    x: [0, 0],
                                    y: [-1.5, 1.5],
                                    line: {color: '#64748b', width: 4},
                                    text: ['', '透镜'],
                                    textposition: 'top center',
                                    name: '透镜',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [xObj, 0],
                                    y: [yObj, yObj],
                                    line: {color: '#ef4444', width: 3},
                                    name: '平行主光线',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [0, xMax],
                                    y: [yObj, rightEndParallel.y],
                                    line: {color: '#ef4444', width: 3},
                                    showlegend: false,
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [xObj, 0],
                                    y: [yObj, 0],
                                    line: {color: '#2563eb', width: 3},
                                    name: '中心主光线',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [0, xMax],
                                    y: [0, rightEndCenter.y],
                                    line: {color: '#2563eb', width: 3},
                                    showlegend: false,
                                },
                                ...virtualExtensionTraces,
                                ...imageTrace,
                                ...overflowImageTrace,
                            ]}
                            layout={{
                                width: 840,
                                height: 560,
                                autosize: false,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                xaxis: {range: [xMin, xMax], visible: false, fixedrange: true},
                                yaxis: {range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1},
                                shapes: [
                                    {
                                        type: 'line',
                                        x0: -xF,
                                        x1: -xF,
                                        y0: -0.12,
                                        y1: 0.12,
                                        line: {color: '#6b7280', width: 2},
                                    },
                                    {
                                        type: 'line',
                                        x0: xF,
                                        x1: xF,
                                        y0: -0.12,
                                        y1: 0.12,
                                        line: {color: '#6b7280', width: 2},
                                    },
                                ],
                                annotations: [
                                    {x: -xF, y: -0.24, text: 'F', showarrow: false},
                                    {x: xF, y: -0.24, text: 'F', showarrow: false},
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.96,
                                        text: nearFocus ? 'u≈f，像在无穷远（近似）' : `u=${u.toFixed(1)}cm, f=${f.toFixed(1)}cm, v=${imageDistanceText}cm`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    ...overflowAnnotations,
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
