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
    loading: () => (<Skeleton width={860} height={500} />),
});

export default function Page() {
    const [f0, setF0] = React.useState<number>(100);
    const [nr, setNr] = React.useState<number>(1.54);
    const [nb, setNb] = React.useState<number>(1.56);

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
            line: { color: 'rgba(220,38,38,0.5)', width: 2 },
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [lensX, fRedPlot],
            y: [y, 0],
            line: { color: 'rgba(220,38,38,0.85)', width: 2.5 },
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
            line: { color: 'rgba(37,99,235,0.45)', width: 2 },
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
        {
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: [lensX, fBluePlot],
            y: [y + 0.08, 0],
            line: { color: 'rgba(37,99,235,0.85)', width: 2.5 },
            showlegend: false,
            hoverinfo: 'skip' as const,
        },
    ]));

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: [leftX, 5.2],
            y: [0, 0],
            line: { color: '#111827', width: 2 },
            name: '主光轴',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [fRedPlot],
            y: [0],
            marker: { size: 10, color: '#dc2626' },
            text: [`f红=${fRed.toFixed(1)}mm`],
            textposition: 'top center',
            name: '红光焦点',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [fBluePlot],
            y: [0],
            marker: { size: 10, color: '#2563eb' },
            text: [`f蓝=${fBlue.toFixed(1)}mm`],
            textposition: 'bottom center',
            name: '蓝光焦点',
        },
        ...redRays,
        ...blueRays,
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'f0',
            label: <span>基准焦距 <MathKatexInline math="f_0" fallback="f₀" /> (mm)</span>,
            type: 'slider',
            value: f0,
            min: 50,
            max: 200,
            step: 1,
            onChange: setF0,
            tipIncrease: '调大透镜的基础焦距，不同颜色光的焦距绝对差异会变大，但相对差异会变小，色差的视觉效果会稍有减弱。',
            tipDecrease: '调小透镜的基础焦距，焦距绝对差异变小，相对差异变大，色差的视觉效果会增强。',
            marks: [{ value: 50, label: '50' }, { value: 200, label: '200' }],
        },
        {
            key: 'nr',
            label: <span>红光折射率 <MathKatexInline math="n_r" fallback="nᵣ" /></span>,
            type: 'slider',
            value: nr,
            min: 1.50,
            max: 1.57,
            step: 0.001,
            onChange: (value) => {
                setNr(value);
                setNb((prev) => Math.max(prev, value + 0.001));
            },
            tipIncrease: '调大红光的折射率，红光与蓝光的折射率差会变小，色差会减弱。',
            tipDecrease: '调小红光的折射率，折射率差会变大，色差会增强。',
            marks: [{ value: 1.50, label: '1.50' }, { value: 1.57, label: '1.57' }],
        },
        {
            key: 'nb',
            label: <span>蓝光折射率 <MathKatexInline math="n_b" fallback="nᵦ" /></span>,
            type: 'slider',
            value: nb,
            min: 1.51,
            max: 1.59,
            step: 0.001,
            onChange: (value) => setNb(Math.max(value, nr + 0.001)),
            tipIncrease: '调大蓝光的折射率，蓝光与红光的折射率差会变大，色差会增强，成像边缘彩色镶边更明显。',
            tipDecrease: '调小蓝光的折射率，折射率差会变小，色差会减弱。',
            marks: [{ value: 1.51, label: '1.51' }, { value: 1.59, label: '1.59' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>红光焦距 <MathKatexInline math="f_r" fallback="fᵣ" /> (mm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={fRed.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>蓝光焦距 <MathKatexInline math="f_b" fallback="fᵦ" /> (mm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={fBlue.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>色差 <MathKatexInline math="\\Delta f" fallback="Δf" /> (mm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={deltaF.toFixed(3)} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 20, l: 20, r: 20, b: 20 },
                xaxis: { range: [-4.1, 5.4], visible: false, fixedrange: true },
                yaxis: { range: [-1.6, 1.6], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
                shapes: [
                    {
                        type: 'line',
                        x0: lensX,
                        x1: lensX,
                        y0: -1.2,
                        y1: 1.2,
                        line: { color: '#64748b', width: 4 },
                    },
                    {
                        type: 'line',
                        x0: fRedPlot,
                        x1: fBluePlot,
                        y0: -0.16,
                        y1: -0.16,
                        line: { color: '#111827', width: 2, dash: 'dot' },
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
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `1/f=(n-1)(1/R1-1/R2) | nr=${nr.toFixed(3)}, nb=${nb.toFixed(3)}`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
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
                    label: '📷相机镜头型',
                    tip: '对应普通相机镜头的轻微色差状态，不同颜色光的焦距差异较小，成像边缘仅有轻微的彩色镶边，画面整体清晰，是日常摄影的常见镜头效果。',
                    onClick: () => {
                        setF0(100);
                        setNr(1.54);
                        setNb(1.56);
                    },
                },
                {
                    label: '🔍明显色差型',
                    tip: '对应普通放大镜的色差状态，不同颜色光的焦距差异大，成像边缘出现明显的彩色镶边，画面模糊，色彩偏移严重，体现了单透镜的色差缺陷。',
                    onClick: () => {
                        setF0(50);
                        setNr(1.50);
                        setNb(1.58);
                    },
                },
                {
                    label: '✨消色差型',
                    tip: '对应专业消色差镜头的状态，不同颜色光的焦距差异极小，成像边缘无彩色镶边，画面清晰锐利，类似单反相机的高端镜头效果，解决了单透镜的色差问题。',
                    onClick: () => {
                        setF0(200);
                        setNr(1.545);
                        setNb(1.555);
                    },
                },
            ]}
            hint={{
                title: '透镜色差',
                content: (
                    <span>
                        同学们好，欢迎来到透镜色差实验。<br />
                        相机消色差镜头的设计、望远镜的清晰成像，都是为了克服透镜色差。调节透镜焦距
                        <MathKatexInline math="f_0" fallback="f0" />、红光
                        <MathKatexInline math="n_r" fallback="nr" /> 和蓝光
                        <MathKatexInline math="n_b" fallback="nb" /> 的折射率，能看到色差变化：红蓝折射率差值越大、焦距越小，色差越明显，理解双胶合透镜消色差的原理。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'lens-blue-red-focus',
                    type: 'single',
                    prompt: (
                        <span>
                            蓝光和红光相比，谁的焦距更短？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">红光焦距更短，因为红光波长更长</span>,
                        <span key="q1-o2">蓝光焦距更短，因为蓝光折射率更大、偏折更强</span>,
                        <span key="q1-o3">两者焦距始终相同，与折射率无关</span>,
                        <span key="q1-o4">无法判断，必须先知道透镜材料颜色</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：蓝光对应更大的折射率，聚焦能力更强，因而焦距更短（<MathKatexInline math="f_b<f_r" fallback="fb<fr" />）。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：蓝光和红光的折射率不同，折射率大的色光焦距更短。
                        </span>
                    ),
                },
                {
                    id: 'lens-index-difference-aberration',
                    type: 'single',
                    prompt: (
                        <span>
                            当折射率差 <MathKatexInline math="n_b-n_r" fallback="nb-nr" /> 变大时，色差会如何变化？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">色差减小，各色焦点更接近</span>,
                        <span key="q2-o2">色差变得更明显，各色光焦点分离更显著</span>,
                        <span key="q2-o3">只影响亮度，不影响焦点位置</span>,
                        <span key="q2-o4">色差与折射率差无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：<MathKatexInline math="n_b-n_r" fallback="nb-nr" /> 越大，<MathKatexInline math="f_b" fallback="fb" /> 与 <MathKatexInline math="f_r" fallback="fr" /> 分离越明显，色差更严重。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：折射率差越大，不同色光的焦点分离越明显，色差会更严重。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">透镜材料折射率随波长变化，导致不同颜色光线具有不同焦距，形成色差。</span>,
                <span key="s2">通常蓝光折射率更大，因此满足 <MathKatexInline math="f_b<f_r" fallback="fb<fr" />，蓝光焦点位于红光焦点前方。</span>,
                <span key="s3">薄透镜近轴关系可写为 <MathKatexInline math="\\frac{1}{f}=(n-1)\\left(\\frac{1}{R_1}-\\frac{1}{R_2}\\right)" fallback="1/f=(n-1)(1/R1-1/R2)" />。</span>,
                '双胶合透镜通过组合不同色散特性的材料，可在保持成像能力的同时显著减小色差。',
            ]}
            applicationItems={[
                '相机消色差镜头通过多片玻璃协同校正不同波长焦点，提升边缘清晰度与色彩还原。',
                '望远镜中若不校正色差，亮星边缘会出现彩边；消色差物镜可改善长焦观测质量。',
                '显微镜高倍率成像对焦点重合要求高，消色差设计能减少彩边并提高细节分辨能力。',
            ]}
        />
    );
}
