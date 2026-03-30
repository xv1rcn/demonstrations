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
    loading: () => (<Skeleton width={920} height={540} />),
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function Page() {
    const [fObj, setFObj] = React.useState<number>(4);
    const [fEye, setFEye] = React.useState<number>(10);
    const [uObj, setUObj] = React.useState<number>(5);

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
            line: { color: '#111827', width: 2 },
            name: '主光轴',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xObj, xObj],
            y: [0, yObjectTop],
            line: { color: '#111827', width: 4 },
            text: ['', '物'],
            textposition: yObjectTop >= 0 ? 'top center' : 'bottom center',
            name: '物体',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xInter, xInter],
            y: [0, yInter],
            line: { color: '#374151', width: 4 },
            text: ['', '中间实像'],
            textposition: yInter >= 0 ? 'top center' : 'bottom center',
            name: '中间像',
        },
        {
            type: 'scatter',
            mode: 'text+lines',
            x: [xFinal, xFinal],
            y: [0, yFinal],
            line: { color: '#111827', width: 4, dash: 'dot' },
            text: ['', '最终虚像'],
            textposition: yFinal >= 0 ? 'top center' : 'bottom center',
            name: '最终虚像',
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, xLens1],
            y: [yObjectTop, yObjectTop],
            line: { color: '#ef4444', width: 3 },
            name: '物镜平行主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens1, xInter],
            y: [yObjectTop, yInter],
            line: { color: '#ef4444', width: 3 },
            showlegend: false,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xObj, xLens1],
            y: [yObjectTop, 0],
            line: { color: '#2563eb', width: 3 },
            name: '物镜中心主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens1, xInter],
            y: [0, yInter],
            line: { color: '#2563eb', width: 3 },
            showlegend: false,
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xInter, xLens2],
            y: [yInter, yInter],
            line: { color: '#f59e0b', width: 3 },
            name: '目镜平行主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xRight],
            y: [yInter, yRay1AtRight],
            line: { color: '#f59e0b', width: 3 },
            showlegend: false,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xInter, xLens2],
            y: [yInter, 0],
            line: { color: '#0ea5e9', width: 3 },
            name: '目镜中心主光线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xRight],
            y: [0, yRay2AtRight],
            line: { color: '#0ea5e9', width: 3 },
            showlegend: false,
        },

        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xFinal],
            y: [yInter, yFinal],
            line: { color: '#f59e0b', width: 2, dash: 'dot' },
            name: '反向延长线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [xLens2, xFinal],
            y: [0, yFinal],
            line: { color: '#0ea5e9', width: 2, dash: 'dot' },
            showlegend: false,
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'fObj',
            label: <span>物镜焦距 <MathKatexInline math="f_{\text{物}}" fallback="f物" /> (mm)</span>,
            type: 'slider',
            value: fObj,
            min: 2,
            max: 10,
            step: 0.1,
            onChange: setFObj,
            tipIncrease: '调大物镜的焦距，物镜的放大倍率会降低，显微镜的总放大倍率也会降低，视野范围变大。',
            tipDecrease: '调小物镜的焦距，物镜的放大倍率会提高，显微镜的总放大倍率也会提高，视野范围变小。',
            marks: [{ value: 2, label: '2' }, { value: 4, label: '4' }, { value: 10, label: '10' }],
        },
        {
            key: 'fEye',
            label: <span>目镜焦距 <MathKatexInline math="f_{\text{目}}" fallback="f目" /> (mm)</span>,
            type: 'slider',
            value: fEye,
            min: 5,
            max: 25,
            step: 0.1,
            onChange: setFEye,
            tipIncrease: '调大目镜的焦距，目镜的放大倍率会降低，显微镜的总放大倍率也会降低，观察到的像更柔和。',
            tipDecrease: '调小目镜的焦距，目镜的放大倍率会提高，显微镜的总放大倍率也会提高，观察到的像更清晰。',
            marks: [{ value: 5, label: '5' }, { value: 10, label: '10' }, { value: 25, label: '25' }],
        },
        {
            key: 'uObj',
            label: <span>物距 <MathKatexInline math="u" fallback="u" /> (mm)</span>,
            type: 'slider',
            value: uObj,
            min: uMin,
            max: uMax,
            step: 0.1,
            onChange: setUObj,
            tipIncrease: '调大物距，物镜成的实像会变小，显微镜的整体放大效果会减弱。',
            tipDecrease: '调小物距，在物镜的成像范围内，成的实像会变大，显微镜的整体放大效果会增强。',
            marks: [{ value: uMin, label: `${uMin}` }, { value: uMax, label: `${uMax}` }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>物镜放大率 <MathKatexInline math="M_{\text{物}}" fallback="M物" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={mObj.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>目镜放大率 <MathKatexInline math="M_{\text{目}}" fallback="M目" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={mEye.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>总放大倍率 <MathKatexInline math="M" fallback="M" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={mTotal.toFixed(3)} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 840,
                height: 540,
                margin: { t: 24, l: 28, r: 24, b: 24 },
                xaxis: { range: [xMin, xMax], visible: false, fixedrange: true },
                yaxis: { range: [yMin, yMax], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
                shapes: [
                    {
                        type: 'line',
                        x0: xLens1,
                        x1: xLens1,
                        y0: yMin * 0.65,
                        y1: yMax * 0.65,
                        line: { color: '#64748b', width: 4 },
                    },
                    {
                        type: 'line',
                        x0: xLens2,
                        x1: xLens2,
                        y0: yMin * 0.65,
                        y1: yMax * 0.65,
                        line: { color: '#64748b', width: 4 },
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
                    label: '🔬生物观察型',
                    tip: '对应实验室普通生物显微镜的成像状态，放大倍率适中，能清晰观察细胞、微生物等标本，是日常生物实验的标准显微镜使用效果。',
                    onClick: () => {
                        setFObj(4);
                        setFEye(10);
                        setUObj(5);
                    },
                },
                {
                    label: '🧫高倍观察型',
                    tip: '对应专业高倍显微镜的成像状态，物镜焦距极小，放大倍率极高，能观察到细胞的精细结构，如细胞核、细胞器等，适合精密的生物病理检测。',
                    onClick: () => {
                        setFObj(2);
                        setFEye(10);
                        setUObj(5);
                    },
                },
                {
                    label: '👀低倍观察型',
                    tip: '对应显微镜的低倍观察状态，物镜焦距较大，放大倍率较低，能观察到标本的整体形态，视野范围大，适合快速定位标本的观察位置。',
                    onClick: () => {
                        setFObj(10);
                        setFEye(25);
                        setUObj(12);
                    },
                },
            ]}
            hint={{
                title: '显微镜成像',
                content: (
                    <span>
                        同学们好，欢迎来到显微镜成像实验。<br />
                        生物显微镜的细胞观察、病理检测的细节放大，靠的是显微镜的物镜和目镜配合。调节物镜焦距
                        <MathKatexInline math="f_{\text{物}}" fallback="f物" />、目镜焦距
                        <MathKatexInline math="f_{\text{目}}" fallback="f目" />、物距
                        <MathKatexInline math="u" fallback="u" />，能看到放大效果：物镜焦距越小、目镜倍率越高，总放大倍数越大，理解显微镜的放大原理。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'microscope-objective-image-type',
                    type: 'single',
                    prompt: (
                        <span>
                            显微镜物镜首先形成的像，通常具有什么性质？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">正立、缩小的虚像</span>,
                        <span key="q1-o2">倒立、放大的实像</span>,
                        <span key="q1-o3">正立、等大的实像</span>,
                        <span key="q1-o4">倒立、缩小的虚像</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：物镜先把样品成倒立放大实像，目镜再对该中间像进行二次放大观察。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：显微镜的物镜负责将物体成实像，目镜仅起到放大作用。
                        </span>
                    ),
                },
                {
                    id: 'microscope-objective-focal-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当物镜焦距 <MathKatexInline math="f_{\text{物}}" fallback="f物" /> 变小时，放大倍数如何变化？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">物镜放大倍数降低</span>,
                        <span key="q2-o2">物镜放大倍数基本不变</span>,
                        <span key="q2-o3">物镜放大倍数升高</span>,
                        <span key="q2-o4">只改变亮度，不改变放大能力</span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: (
                        <span>
                            正确：在成像位置合理时，物镜焦距越小，通常获得更大的线放大率。
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
                <span key="s1">单透镜成像公式：<MathKatexInline math="\\frac{1}{f}=\\frac{1}{u}+\\frac{1}{v}" fallback="1/f=1/u+1/v" />。</span>,
                <span key="s2">线放大率：<MathKatexInline math="m=-\\frac{v}{u}" fallback="m=-v/u" />，负号代表倒立像。</span>,
                <span key="s3">当 <MathKatexInline math="u>2f" fallback="u>2f" /> 时，得到倒立缩小实像（可类比照相机）。</span>,
                <span key="s4">当 <MathKatexInline math="f<u<2f" fallback="f<u<2f" /> 时，得到倒立放大实像（可类比投影成像阶段）。</span>,
                <span key="s5">当 <MathKatexInline math="u<f" fallback="u<f" /> 时，得到正立放大虚像（可类比放大镜观察）。</span>,
            ]}
            applicationItems={[
                '生物显微镜通过短焦物镜与目镜组合，把细胞等微小结构放大到可见尺度。',
                '病理检测中利用显微成像观察组织切片形态，为诊断提供关键微观证据。',
                '电子显微镜虽不使用可见光透镜公式，但同样遵循“先成中间像再放大”的多级成像思想。',
            ]}
        />
    );
}
