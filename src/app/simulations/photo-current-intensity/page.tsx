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
    loading: () => (<Skeleton width={840} height={500} />),
});

export default function Page() {
    const [intensity, setIntensity] = React.useState<number>(0.2);
    const [frequency, setFrequency] = React.useState<number>(6.2e14);

    const nuMin = 3e14;
    const nu0 = 5e14;
    const nuMax = 9e14;

    const responseCoeff = 10;
    const hasPhotoelectron = frequency > nu0;
    const is = hasPhotoelectron ? responseCoeff * intensity : 0;

    const iLine = React.useMemo(() => {
        const points = 120;
        return Array.from({ length: points }, (_, idx) => idx / (points - 1));
    }, []);

    const isLine = React.useMemo(
        () => iLine.map((i) => (hasPhotoelectron ? responseCoeff * i : 0)),
        [iLine, hasPhotoelectron],
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: iLine,
            y: isLine,
            line: { color: '#2563eb', width: 3 },
            name: hasPhotoelectron ? 'Is ∝ I' : 'ν≤ν0，Is≈0',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [intensity],
            y: [is],
            marker: { size: 10, color: hasPhotoelectron ? '#16a34a' : '#dc2626' },
            text: ['当前点'],
            textposition: 'top center',
            name: '实时打点',
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'intensity',
            label: <span>光强 <MathKatexInline math="I" fallback="I" /></span>,
            type: 'slider',
            value: intensity,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setIntensity,
            tipIncrease: '调大入射光的强度，单位时间内入射的光子数量会增多，产生的光电子数量也会增多，饱和光电流会随之增大。',
            tipDecrease: '调小入射光的强度，光子数量减少，光电子数量减少，饱和光电流会随之减小。',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1' }],
        },
        {
            key: 'frequency',
            label: <span>频率 <MathKatexInline math="\nu" fallback="ν" /> (Hz)</span>,
            type: 'slider',
            value: frequency,
            min: nuMin,
            max: nuMax,
            step: 1e13,
            onChange: setFrequency,
            tipIncrease: '调大入射光的频率，只要频率高于截止频率，光电子的动能会增大，但饱和光电流与频率无关。',
            tipDecrease: '调小入射光的频率，当频率低于截止频率时，无论光强多大，都无法产生光电流。',
            marks: [{ value: nuMin, label: '3e14' }, { value: nu0, label: 'ν0' }, { value: nuMax, label: '9e14' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>饱和光电流 <MathKatexInline math="I_s" fallback="Is" /> (a.u.)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={is.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="阈频条件" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={hasPhotoelectron ? 'ν > ν0，满足出射' : 'ν ≤ ν0，无光电子'} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>阈频 <MathKatexInline math="\nu_0" fallback="ν0" /> (Hz)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={nu0.toExponential(2)} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 840,
                height: 500,
                margin: { t: 24, l: 58, r: 24, b: 52 },
                xaxis: {
                    title: { text: '光强 I' },
                    range: [0, 1],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: '饱和光电流 Is (a.u.)' },
                    range: [0, responseCoeff * 1.15],
                    fixedrange: true,
                },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.02,
                        y: 0.98,
                        text: hasPhotoelectron
                            ? `ν=${frequency.toExponential(2)}Hz > ν0，Is 与 I 成正比`
                            : `ν=${frequency.toExponential(2)}Hz ≤ ν0，Is≈0`,
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
                    label: '🌙弱光感应型',
                    tip: '对应路灯自动控制的弱光感应状态，入射光强度低，单位时间内的光子数量少，产生的光电子数量少，形成的光电流弱，路灯会因弱光而自动开启。',
                    onClick: () => {
                        setIntensity(0.2);
                        setFrequency(6.2e14);
                    },
                },
                {
                    label: '☀️自然光感应型',
                    tip: '对应照度计在自然光下的测量状态，入射光强度适中，单位时间内的光子数量适中，光电流稳定，能准确测量环境的光照强度，是日常测光的常见状态。',
                    onClick: () => {
                        setIntensity(0.5);
                        setFrequency(6.2e14);
                    },
                },
                {
                    label: '🔦强光感应型',
                    tip: '对应光伏板在强光下的发电状态，入射光强度高，单位时间内的光子数量多，产生的光电子数量多，形成的饱和光电流大，光伏板的发电效率达到最高。',
                    onClick: () => {
                        setIntensity(1.0);
                        setFrequency(6.2e14);
                    },
                },
            ]}
            hint={{
                title: '光电流与光强',
                content: (
                    <span>
                        同学们好，欢迎来到光电流与光强实验。<br />
                        照度计的测光、路灯的自动控制，核心是光电流与光强的关系。调节入射光强
                        <MathKatexInline math="I" fallback="I" />，能看到饱和光电流的变化：光强越大，饱和光电流越大，二者成正比，理解光强代表光子数量，频率达标才会产生光电流。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'photo-current-saturation-intensity-relation',
                    type: 'single',
                    prompt: (
                        <span>
                            在 <MathKatexInline math="\nu>\nu_0" fallback="ν>ν0" /> 条件下，饱和光电流 <MathKatexInline math="I_s" fallback="Is" /> 与入射光强 <MathKatexInline math="I" fallback="I" /> 的关系是？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">二者成正比，入射光强越大，饱和光电流越大</span>,
                        <span key="q1-o2">二者成反比，光强越大电流越小</span>,
                        <span key="q1-o3">二者无关系，电流固定不变</span>,
                        <span key="q1-o4">只与材料颜色有关</span>,
                    ],
                    correctOptionIndex: 0,
                    successTip: (
                        <span>
                            正确：在频率满足阈值时，光强增加意味着单位时间光子数增加，故饱和光电流上升。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：饱和光电流的大小，与入射光强的变化呈正比关系。
                        </span>
                    ),
                },
                {
                    id: 'photo-current-below-threshold-intensity',
                    type: 'single',
                    prompt: (
                        <span>
                            当频率低于阈值 <MathKatexInline math="\nu_0" fallback="ν0" /> 时，增大光强能否产生光电流？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">能，光强足够大就一定能出电子</span>,
                        <span key="q2-o2">不能，频率低于阈值时无论光强多大都无光电流</span>,
                        <span key="q2-o3">只有在真空中才可能产生</span>,
                        <span key="q2-o4">需要先降低金属温度才会产生</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：若 <MathKatexInline math="\nu<\nu_0" fallback="ν<ν0" />，单个光子能量不足，增强光强也不能弥补单光子能量缺口。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：若入射光频率低于阈值，无论光强如何增加，都无法产生光电流。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">在满足阈频条件时，饱和光电流 <MathKatexInline math="I_s" fallback="Is" /> 与入射光强 <MathKatexInline math="I" fallback="I" /> 近似成正比。</span>,
                '光强可理解为单位时间光子数规模，光子越多可激发出的电子总数越多。',
                <span key="s3">是否产生光电流首先取决于频率是否满足 <MathKatexInline math="\nu>\nu_0" fallback="ν>ν0" />。</span>,
                '测得的电流大小反映了单位时间到达阳极的光电子数量。',
            ]}
            applicationItems={[
                '照度计把光电流信号转换为照度读数，用于室内照明与工业光环境监测。',
                '路灯自动控制利用光电传感器检测环境亮度，自动切换开灯与关灯状态。',
                '光伏板通过光生载流子产生电流输出，核心也是光强与载流子数量的关联机制。',
            ]}
        />
    );
}
