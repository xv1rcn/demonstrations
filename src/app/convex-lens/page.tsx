'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={560} />),
});

type Point = { x: number; y: number };
type Ray = { p: Point; d: Point };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

const yAtX = (ray: Ray, x: number) => {
    if (Math.abs(ray.d.x) < 1e-9) return ray.p.y;
    return ray.p.y + (x - ray.p.x) * ray.d.y / ray.d.x;
};

const pointOnRayAtX = (ray: Ray, x: number): Point => ({ x, y: yAtX(ray, x) });

export default function Page() {
    const [u, setU] = React.useState<number>(30);
    const [f, setF] = React.useState<number>(10);

    const objectHeight = 1.2;
    const scale = 10;

    const xMin = -16;
    const xMax = 16;
    const yMin = -10;
    const yMax = 10;

    const epsilon = 0.12;
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
        if (v > 0) return m < 0 ? '倒立实像' : '实像';
        return '正立放大虚像';
    }, [nearFocus, v, m]);

    const imageDistanceText = nearFocus ? '∞' : v.toFixed(3);
    const magnificationText = nearFocus ? '∞' : m.toFixed(3);

    const xObj = -u / scale;
    const yObj = objectHeight;
    const xF = f / scale;

    const xImg = nearFocus ? Number.POSITIVE_INFINITY : v / scale;
    const yImg = nearFocus ? 0 : m * yObj;

    const objectTop: Point = { x: xObj, y: yObj };
    const centerPoint: Point = { x: 0, y: 0 };

    const rayParallelOut: Ray = React.useMemo(() => {
        if (nearFocus) {
            return { p: { x: 0, y: yObj }, d: { x: 1, y: 0 } };
        }
        if (v > 0) {
            return { p: { x: 0, y: yObj }, d: { x: xImg, y: yImg - yObj } };
        }
        return { p: { x: 0, y: yObj }, d: { x: xF, y: yObj } };
    }, [nearFocus, v, xImg, yImg, xF, yObj]);

    const rayCenterOut: Ray = {
        p: centerPoint,
        d: { x: centerPoint.x - objectTop.x, y: centerPoint.y - objectTop.y },
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
                line: { color: '#ef4444', width: 2, dash: 'dot' },
                name: '反向延长线',
            },
            {
                type: 'scatter',
                mode: 'lines',
                x: [0, leftExtX],
                y: [0, leftExtCenter.y],
                line: { color: '#2563eb', width: 2, dash: 'dot' },
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
            line: { color: '#111827', width: 4 },
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
            marker: { size: 8, color: '#111827' },
            text: [isRealImage ? '像(超出视窗)' : '虚像(超出视窗)'],
            textposition: imageMarkerY >= 0 ? 'top center' : 'bottom center',
            name: '像',
        }]
        : [];

    const overflowAnnotations = !nearFocus && !imageInView
        ? [
            ...(Number.isFinite(yImg) && yImg > yMax
                ? [{ x: imageMarkerX, y: yMax - 0.04, text: '', showarrow: true, ax: 0, ay: 26, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827' }]
                : []),
            ...(Number.isFinite(yImg) && yImg < yMin
                ? [{ x: imageMarkerX, y: yMin + 0.04, text: '', showarrow: true, ax: 0, ay: -26, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827' }]
                : []),
            ...(Number.isFinite(xImg) && xImg > xMax
                ? [{ x: xMax - 0.04, y: imageMarkerY, text: '', showarrow: true, ax: 26, ay: 0, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827' }]
                : []),
            ...(Number.isFinite(xImg) && xImg < xMin
                ? [{ x: xMin + 0.04, y: imageMarkerY, text: '', showarrow: true, ax: -26, ay: 0, arrowhead: 2, arrowwidth: 2, arrowcolor: '#111827' }]
                : []),
        ]
        : [];

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: [xMin, xMax],
            y: [0, 0],
            line: { color: '#111827', width: 2 },
            name: '主光轴',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xObj, xObj],
            y: [0, yObj],
            line: { color: '#111827', width: 4 },
            text: ['', '物'],
            textposition: 'top center',
            name: '物体',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [0, 0],
            y: [-1.5, 1.5],
            line: { color: '#64748b', width: 4 },
            text: ['', '透镜'],
            textposition: 'top center',
            name: '透镜',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, 0],
            y: [yObj, yObj],
            line: { color: '#ef4444', width: 3 },
            name: '平行主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [0, xMax],
            y: [yObj, rightEndParallel.y],
            line: { color: '#ef4444', width: 3 },
            showlegend: false,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, 0],
            y: [yObj, 0],
            line: { color: '#2563eb', width: 3 },
            name: '中心主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [0, xMax],
            y: [0, rightEndCenter.y],
            line: { color: '#2563eb', width: 3 },
            showlegend: false,
        },
        ...virtualExtensionTraces,
        ...imageTrace,
        ...overflowImageTrace,
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'u',
            label: <span>物距 <MathKatexInline math="u" fallback="u" /> (cm)</span>,
            type: 'slider',
            value: u,
            min: 5,
            max: 60,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setU,
            marks: [{ value: 5, label: '5' }, { value: 20, label: '20' }, { value: 30, label: '30' }, { value: 60, label: '60' }],
        },
        {
            key: 'f',
            label: <span>焦距 <MathKatexInline math="f" fallback="f" /> (cm)</span>,
            type: 'slider',
            value: f,
            min: 5,
            max: 20,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setF,
            marks: [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 20, label: '20' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>像距 <MathKatexInline math="v" fallback="v" /> (cm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={imageDistanceText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>放大率 <MathKatexInline math="m" fallback="m" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={magnificationText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="像的性质" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={imageType} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 560,
                autosize: false,
                margin: { t: 20, l: 20, r: 20, b: 20 },
                xaxis: { range: [xMin, xMax], visible: false, fixedrange: true },
                yaxis: { range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
                shapes: [
                    {
                        type: 'line',
                        x0: -xF,
                        x1: -xF,
                        y0: -0.12,
                        y1: 0.12,
                        line: { color: '#6b7280', width: 2 },
                    },
                    {
                        type: 'line',
                        x0: xF,
                        x1: xF,
                        y0: -0.12,
                        y1: 0.12,
                        line: { color: '#6b7280', width: 2 },
                    },
                ],
                annotations: [
                    { x: -xF, y: -0.24, text: 'F', showarrow: false },
                    { x: xF, y: -0.24, text: 'F', showarrow: false },
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
                legend: { orientation: 'h', x: 0.02, y: 1.08 },
            }}
        />
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                {
                    label: '实像',
                    onClick: () => {
                        setU(30);
                        setF(10);
                    },
                },
                {
                    label: '等大',
                    onClick: () => {
                        setU(20);
                        setF(10);
                    },
                },
                {
                    label: '虚像',
                    onClick: () => {
                        setU(5);
                        setF(10);
                    },
                },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'convex-u-greater-than-2f',
                    type: 'single',
                    prompt: (
                        <span>
                            当物距满足 <MathKatexInline math="u>2f" fallback="u>2f" /> 时，凸透镜成像性质通常是什么？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">正立、放大的虚像</span>,
                        <span key="q1-o2">倒立、缩小的实像</span>,
                        <span key="q1-o3">正立、等大的实像</span>,
                        <span key="q1-o4">倒立、放大的虚像</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：当 <MathKatexInline math="u>2f" fallback="u>2f" /> 时，像位于 <MathKatexInline math="f<v<2f" fallback="f<v<2f" />，为倒立、缩小实像。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：物距大于2倍焦距时，成像性质可结合照相机的工作原理回忆。
                        </span>
                    ),
                },
                {
                    id: 'convex-u-less-than-f',
                    type: 'single',
                    prompt: (
                        <span>
                            当物距满足 <MathKatexInline math="u<f" fallback="u<f" /> 时，成像性质是什么？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">倒立、缩小的实像</span>,
                        <span key="q2-o2">倒立、放大的实像</span>,
                        <span key="q2-o3">正立、放大的虚像</span>,
                        <span key="q2-o4">正立、缩小的虚像</span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: (
                        <span>
                            正确：当 <MathKatexInline math="u<f" fallback="u<f" /> 时，像在物体同侧，表现为正立放大虚像。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：物距小于焦距时，成的是虚像，且具有放大的特点。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">凸透镜近轴成像公式：<MathKatexInline math="\\frac{1}{f}=\\frac{1}{u}+\\frac{1}{v}" fallback="1/f=1/u+1/v" />。</span>,
                <span key="s2">横向放大率：<MathKatexInline math="m=-\\frac{v}{u}" fallback="m=-v/u" />，负号对应倒立像。</span>,
                <span key="s3">当 <MathKatexInline math="u>2f" fallback="u>2f" /> 时，成倒立缩小实像（典型：照相机）。</span>,
                <span key="s4">当 <MathKatexInline math="f<u<2f" fallback="f<u<2f" /> 时，成倒立放大实像（典型：投影仪）。</span>,
                <span key="s5">当 <MathKatexInline math="u<f" fallback="u<f" /> 时，成正立放大虚像（典型：放大镜）。</span>,
            ]}
            applicationItems={[
                '人眼晶状体通过改变曲率调焦，使视网膜上获得清晰实像，实现远近视觉切换。',
                '照相机利用凸透镜把远处景物成倒立缩小实像，再由传感器记录成照片。',
                '投影仪将小尺寸图像经透镜成倒立放大实像投到屏幕上，形成可视大画面。',
                '放大镜在物距小于焦距时提供正立放大虚像，便于观察细小文字与结构。',
            ]}
        />
    );
}
