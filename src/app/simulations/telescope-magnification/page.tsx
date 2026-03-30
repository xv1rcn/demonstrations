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
    loading: () => (<Skeleton width={900} height={520} />),
});

export default function Page() {
    const [fObj, setFObj] = React.useState<number>(100);
    const [fEye, setFEye] = React.useState<number>(10);

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
        return { yAtMin, yAtLens, yAtEye, yAtMax };
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
            line: { color: '#111827', width: 2 },
            name: '主光轴',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [xFocus],
            y: [yImage],
            marker: { size: 8, color: '#111827' },
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
                    line: { color: '#10b981', width: 2.6 },
                    name: showLegend ? '入射平行光' : undefined,
                    showlegend: showLegend,
                },
                {
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    x: [xLensObj, xLensEye],
                    y: [ray.yAtLens, ray.yAtEye],
                    line: { color: '#f59e0b', width: 2.6 },
                    name: showLegend ? '物镜后会聚光' : undefined,
                    showlegend: showLegend,
                },
                {
                    type: 'scatter' as const,
                    mode: 'lines' as const,
                    x: [xLensEye, xMax],
                    y: [ray.yAtEye, ray.yAtMax],
                    line: { color: '#2563eb', width: 2.6 },
                    name: showLegend ? '目镜后出射平行光' : undefined,
                    showlegend: showLegend,
                },
            ];
        }),
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'fObj',
            label: <span>物镜焦距 <MathKatexInline math="f_{\text{物}}" fallback="f物" /> (mm)</span>,
            type: 'slider',
            value: fObj,
            min: 50,
            max: 220,
            step: 1,
            onChange: setFObj,
            tipIncrease: '调大物镜的焦距，望远镜的放大倍率会提高，能观察到更远的物体且像更大，聚光能力也会增强，画面更明亮。',
            tipDecrease: '调小物镜的焦距，放大倍率会降低，聚光能力减弱，视野范围变大。',
            marks: [{ value: 50, label: '50' }, { value: 100, label: '100' }, { value: 200, label: '200' }],
        },
        {
            key: 'fEye',
            label: <span>目镜焦距 <MathKatexInline math="f_{\text{目}}" fallback="f目" /> (mm)</span>,
            type: 'slider',
            value: fEye,
            min: 5,
            max: 20,
            step: 0.1,
            onChange: setFEye,
            tipIncrease: '调大目镜的焦距，望远镜的放大倍率会降低，观察到的像更小，视野范围更大。',
            tipDecrease: '调小目镜的焦距，放大倍率会提高，观察到的像更大，视野范围变小。',
            marks: [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 15, label: '15' }, { value: 20, label: '20' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>角放大率 <MathKatexInline math="M" fallback="M" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={m.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>放大倍率 <MathKatexInline math="|M|" fallback="|M|" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={absM.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="视场粗略值 (°)" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={fieldApprox.toFixed(3)} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 840,
                height: 520,
                margin: { t: 24, l: 24, r: 24, b: 24 },
                xaxis: { range: [xMin, xMax], visible: false, fixedrange: true },
                yaxis: { range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
                shapes: [
                    {
                        type: 'line',
                        x0: xLensObj,
                        x1: xLensObj,
                        y0: yMin * 0.75,
                        y1: yMax * 0.75,
                        line: { color: '#64748b', width: 4 },
                    },
                    {
                        type: 'line',
                        x0: xLensEye,
                        x1: xLensEye,
                        y0: yMin * 0.75,
                        y1: yMax * 0.75,
                        line: { color: '#64748b', width: 4 },
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
                    label: '🔭观鸟观景型',
                    tip: '对应普通观鸟镜、观景望远镜的使用状态，放大倍率适中，视野范围较大，能清晰观察远处的鸟类、风景，手持使用也能保持画面稳定。',
                    onClick: () => {
                        setFObj(100);
                        setFEye(10);
                    },
                },
                {
                    label: '🌌天文观测型',
                    tip: '对应专业天文望远镜的观测状态，物镜焦距极大，放大倍率极高，能清晰观察远处的天体，如月亮、行星等，适合天文爱好者的深空观测。',
                    onClick: () => {
                        setFObj(200);
                        setFEye(5);
                    },
                },
                {
                    label: '👀便携远望型',
                    tip: '对应便携迷你望远镜的使用状态，放大倍率较低，物镜焦距较小，视野范围大，便于携带，适合日常户外的远距离粗略观察。',
                    onClick: () => {
                        setFObj(50);
                        setFEye(15);
                    },
                },
            ]}
            hint={{
                title: '望远镜倍率',
                content: (
                    <span>
                        同学们好，欢迎来到望远镜倍率实验。<br />
                        天文望远镜观星、观鸟镜看远处景物，核心是物镜和目镜的焦距搭配。调节物镜焦距
                        <MathKatexInline math="f_{\text{物}}" fallback="f物" />、目镜焦距
                        <MathKatexInline math="f_{\text{目}}" fallback="f目" />，能看到放大倍率变化：物镜焦距越长、目镜越短，放大倍率越高，理解望远镜收集光和放大视角的双重作用。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'telescope-magnification-ratio',
                    type: 'single',
                    prompt: (
                        <span>
                            关于望远镜角放大率 <MathKatexInline math="M" fallback="M" /> 与焦距关系，下列哪项正确？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1"><MathKatexInline math="M=-\\frac{f_{\text{物}}}{f_{\text{目}}}" fallback="M=-f物/f目" />，由物镜与目镜焦距比决定</span>,
                        <span key="q1-o2"><MathKatexInline math="M=-\\frac{f_{\text{目}}}{f_{\text{物}}}" fallback="M=-f目/f物" />，与常见望远镜无关</span>,
                        <span key="q1-o3"><MathKatexInline math="M=f_{\text{物}}+f_{\text{目}}" fallback="M=f物+f目" /></span>,
                        <span key="q1-o4">放大率与焦距无关，仅取决于物体亮度</span>,
                    ],
                    correctOptionIndex: 0,
                    successTip: (
                        <span>
                            正确：开普勒式望远镜在远处目标条件下，角放大率满足 <MathKatexInline math="M=-\\frac{f_{\text{物}}}{f_{\text{目}}}" fallback="M=-f物/f目" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：显微镜的物镜负责将物体成实像，目镜仅起到放大作用。
                        </span>
                    ),
                },
                {
                    id: 'telescope-far-object-purpose',
                    type: 'single',
                    prompt: (
                        <span>
                            望远镜的主要设计目标是什么？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">专门观察极近处小物体（替代放大镜）</span>,
                        <span key="q2-o2">主要用于观察远处或近似无穷远目标</span>,
                        <span key="q2-o3">只适合观察透镜内部结构</span>,
                        <span key="q2-o4">只能在显微尺度下工作</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：望远镜通常对远处目标优化，通过长焦物镜收光并由目镜放大观察角度。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：物镜的焦距与放大倍数成反比，焦距越小，放大能力越强。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">望远镜角放大率关系：<MathKatexInline math="M=-\\frac{f_{\text{物}}}{f_{\text{目}}}" fallback="M=-f物/f目" />。</span>,
                '物镜焦距较长可增强集光能力并提高分辨远处细节的潜力，是远距观测的关键。',
                '目镜焦距较短可放大视角，使中间像更易被人眼分辨。',
                '望远镜主要面向远处或近似无穷远目标，不是近距离观察工具。',
            ]}
            applicationItems={[
                '天文望远镜通过大口径长焦物镜收集微弱星光，并借目镜放大实现天体观测。',
                '观鸟镜强调便携与较大放大倍率平衡，用于远距离追踪鸟类与野生动物活动。',
                '狙击镜利用望远成像与瞄准分划系统，提高远距离目标识别与瞄准精度。',
            ]}
        />
    );
}
