'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import type { Data, Shape } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500} />),
});

const H_EV_S = 4.135667696e-15;

export default function Page() {
    const [workFunction, setWorkFunction] = React.useState<number>(2);
    const [frequency, setFrequency] = React.useState<number>(5e14);

    const thresholdFrequency = React.useMemo(() => workFunction / H_EV_S, [workFunction]);

    const rawEk = React.useMemo(() => H_EV_S * frequency - workFunction, [frequency, workFunction]);
    const hasPhotoelectron = rawEk > 0;
    const ek = hasPhotoelectron ? rawEk : 0;

    const nuMin = 2e14;
    const nuMax = 9e14;

    const graphNu = React.useMemo(() => {
        const points = 180;
        const step = (nuMax - nuMin) / (points - 1);
        return Array.from({ length: points }, (_, idx) => nuMin + idx * step);
    }, []);

    const graphEkLine = React.useMemo(
        () => graphNu.map((nu) => H_EV_S * nu - workFunction),
        [graphNu, workFunction],
    );

    const graphEkPhysical = React.useMemo(
        () => graphNu.map((nu) => Math.max(H_EV_S * nu - workFunction, 0)),
        [graphNu, workFunction],
    );

    const yMax = Math.max(0.5, ...graphEkPhysical, ek) * 1.2;
    const yMin = -0.8;

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphEkLine,
            line: { color: '#94a3b8', width: 2, dash: 'dot' },
            name: '理论直线 hν-W',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphEkPhysical,
            line: { color: '#2563eb', width: 3 },
            name: 'Ek(仅ν>ν0)',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [frequency],
            y: [ek],
            marker: { size: 10, color: hasPhotoelectron ? '#16a34a' : '#dc2626' },
            text: [hasPhotoelectron ? '当前点' : '无光电子'],
            textposition: 'top center',
            name: '当前频率',
        },
    ];

    const shapes: Partial<Shape>[] = [
        {
            type: 'line',
            x0: thresholdFrequency,
            x1: thresholdFrequency,
            y0: yMin,
            y1: yMax,
            line: { color: '#ef4444', width: 2, dash: 'dash' as const },
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'workFunction',
            label: <span>逸出功 <MathKatexInline math="W" fallback="W" /> (eV)</span>,
            type: 'slider',
            value: workFunction,
            min: 1,
            max: 4,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setWorkFunction,
            marks: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 4, label: '4' }],
        },
        {
            key: 'frequency',
            label: <span>频率 <MathKatexInline math="\nu" fallback="ν" /> (Hz)</span>,
            type: 'slider',
            value: frequency,
            min: nuMin,
            max: nuMax,
            step: 1e13,
            valueLabelDisplay: 'auto',
            onChange: setFrequency,
            marks: [{ value: 3e14, label: '3e14' }, { value: 5e14, label: '5e14' }, { value: 7e14, label: '7e14' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>最大初动能 <MathKatexInline math="E_k" fallback="Ek" /> (eV)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={ek.toFixed(4)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="是否有光电子" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={hasPhotoelectron ? '有' : '无'} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>截止频率 <MathKatexInline math="\nu_0" fallback="ν0" /> (Hz)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={thresholdFrequency.toExponential(3)} />
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
                margin: { t: 24, l: 56, r: 24, b: 52 },
                xaxis: {
                    title: { text: '频率 ν (Hz)' },
                    range: [nuMin, nuMax],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: 'Ek (eV)' },
                    range: [yMin, yMax],
                    fixedrange: true,
                },
                shapes,
                annotations: [
                    {
                        x: thresholdFrequency,
                        y: yMax * 0.9,
                        text: `截止频率 ν0=${thresholdFrequency.toExponential(2)} Hz`,
                        showarrow: true,
                        arrowhead: 2,
                        ax: 36,
                        ay: -20,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `Ek=hν-W | ν=${frequency.toExponential(2)} Hz, W=${workFunction.toFixed(2)} eV`,
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
                    label: '临界频率',
                    onClick: () => {
                        setFrequency(5e14);
                        setWorkFunction(2);
                    },
                },
                {
                    label: '有光电子',
                    onClick: () => {
                        setFrequency(7e14);
                        setWorkFunction(2);
                    },
                },
                {
                    label: '无光电子',
                    onClick: () => {
                        setFrequency(3e14);
                        setWorkFunction(2);
                    },
                },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'photoelectric-max-kinetic-factor',
                    type: 'single',
                    prompt: (
                        <span>
                            光电子最大初动能 <MathKatexInline math="E_k" fallback="Ek" /> 主要由什么决定？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">由入射光频率决定，与光强无关</span>,
                        <span key="q1-o2">由光强决定，与频率无关</span>,
                        <span key="q1-o3">只由照射时间决定</span>,
                        <span key="q1-o4">只由金属面积决定</span>,
                    ],
                    correctOptionIndex: 0,
                    successTip: (
                        <span>
                            正确：依据 <MathKatexInline math="E_k=h\nu-W" fallback="Ek=hν-W" />，在材料确定时，
                            <MathKatexInline math="E_k" fallback="Ek" /> 随频率变化，和光强无直接关系。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：光电子的最大初动能，与光的频率相关，和光的强度无关。
                        </span>
                    ),
                },
                {
                    id: 'photoelectric-below-threshold-result',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射光频率低于截止频率 <MathKatexInline math="\nu_0" fallback="ν0" /> 时，会出现什么结果？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">只要增大光强就一定有光电子</span>,
                        <span key="q2-o2">无论光强多大，都不会产生光电子（无光电流）</span>,
                        <span key="q2-o3">光电子数不变但动能无穷大</span>,
                        <span key="q2-o4">会直接产生γ射线</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：若 <MathKatexInline math="\nu<\nu_0" fallback="ν<ν0" />，单个光子能量不足以克服逸出功，因而无光电子。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：只有入射光频率超过截止频率，才能产生光电子，光强再大也无法弥补。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">爱因斯坦光电方程：<MathKatexInline math="E_k=h\nu-W" fallback="Ek=hν-W" />。</span>,
                '光电子最大初动能由频率决定，光强主要影响单位时间内电子数目。',
                <span key="s3">当 <MathKatexInline math="\nu<\nu_0" fallback="ν<ν0" /> 时，即使增强光强也不会出现光电流。</span>,
                '光电效应实验直接支持光量子观点，证明光具有粒子性。',
            ]}
            applicationItems={[
                '光控开关利用光电元件把光信号转为电信号，实现自动照明或安全触发。',
                '太阳能电池基于光生载流子效应把光能转为电能，是可再生能源核心器件之一。',
                '数码相机感光芯片通过光电转换记录亮度与颜色信息，形成数字图像。',
            ]}
        />
    );
}
