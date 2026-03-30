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

const toRad = (deg: number) => deg * Math.PI / 180;

export default function Page() {
    const [alphaDeg, setAlphaDeg] = React.useState<number>(0);
    const [betaDeg, setBetaDeg] = React.useState<number>(0);
    const [i0, setI0] = React.useState<number>(1);

    const deltaDeg = React.useMemo(() => {
        const diff = Math.abs(betaDeg - alphaDeg);
        return diff > 180 ? 360 - diff : diff;
    }, [alphaDeg, betaDeg]);

    const transmittedI = React.useMemo(
        () => i0 * Math.pow(Math.cos(toRad(deltaDeg)), 2),
        [i0, deltaDeg],
    );

    const xDeg = React.useMemo(() => Array.from({ length: 181 }, (_, idx) => idx), []);
    const yCurve = React.useMemo(
        () => xDeg.map((deg) => i0 * Math.pow(Math.cos(toRad(deg)), 2)),
        [xDeg, i0],
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: xDeg,
            y: yCurve,
            line: { color: '#16a34a', width: 3 },
            name: 'I(Δθ)',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [deltaDeg],
            y: [transmittedI],
            marker: { size: 10, color: '#dc2626' },
            text: [`当前点`],
            textposition: 'top center',
            name: '实时打点',
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'alphaDeg',
            label: <span>第一偏振片角度 <MathKatexInline math="\\alpha" fallback="α" /> (°)</span>,
            type: 'slider',
            value: alphaDeg,
            min: 0,
            max: 180,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setAlphaDeg,
            marks: [{ value: 0, label: '0' }, { value: 90, label: '90' }, { value: 180, label: '180' }],
        },
        {
            key: 'betaDeg',
            label: <span>第二偏振片角度 <MathKatexInline math="\\beta" fallback="β" /> (°)</span>,
            type: 'slider',
            value: betaDeg,
            min: 0,
            max: 180,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setBetaDeg,
            marks: [{ value: 0, label: '0' }, { value: 90, label: '90' }, { value: 180, label: '180' }],
        },
        {
            key: 'i0',
            label: <span>入射光强 <MathKatexInline math="I_0" fallback="I₀" /></span>,
            type: 'slider',
            value: i0,
            min: 0,
            max: 1,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: setI0,
            marks: [{ value: 0, label: '0' }, { value: 1, label: '1' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>夹角 <MathKatexInline math="\Delta\theta" fallback="Δθ" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={deltaDeg.toFixed(1)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>透射光强 <MathKatexInline math="I" fallback="I" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={transmittedI.toFixed(4)} />
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
                margin: { t: 24, l: 58, r: 24, b: 52 },
                xaxis: {
                    title: { text: '偏振片夹角 Δθ (°)' },
                    range: [0, 180],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: '透射光强 I' },
                    range: [0, Math.max(1.05, i0 * 1.05)],
                    fixedrange: true,
                },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `I=I0·cos²Δθ | α=${alphaDeg.toFixed(0)}°, β=${betaDeg.toFixed(0)}°, I0=${i0.toFixed(2)}`,
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
                    label: '默认参数',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(0);
                        setI0(1);
                    },
                },
                {
                    label: '消光',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(90);
                        setI0(1);
                    },
                },
                {
                    label: '半光强',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(45);
                        setI0(1);
                    },
                },
            ]}
            hint={{
                title: '偏振片・马吕斯定律',
                content: (
                    <span>
                        同学们好，欢迎来到偏振片・马吕斯定律实验。<br />
                        偏振太阳镜过滤强光、手机屏幕的偏振显示，都遵循马吕斯定律。调节两个偏振片的夹角
                        <MathKatexInline math="\Delta\theta" fallback="Δθ" />、入射光强
                        <MathKatexInline math="I_0" fallback="I₀" />，能看到出射光强的变化：偏振片平行时光强最强，垂直时完全消光，夹角
                        <MathKatexInline math="45^\circ" fallback="45°" /> 时光强为原来的一半，理解偏振光的传播规律。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'malus-45deg',
                    type: 'single',
                    prompt: (
                        <span>
                            两偏振片夹角为 <MathKatexInline math="45^\circ" fallback="45°" /> 时，透射光强
                            <MathKatexInline math="I" fallback="I" /> 相对于 <MathKatexInline math="I_0" fallback="I₀" /> 是多少？
                        </span>
                    ),
                    options: [
                        <span key="m45-o1"><MathKatexInline math="I=I_0" fallback="I=I₀" /></span>,
                        <span key="m45-o2"><MathKatexInline math="I=0.5I_0" fallback="I=0.5I₀" /></span>,
                        <span key="m45-o3"><MathKatexInline math="I=0.25I_0" fallback="I=0.25I₀" /></span>,
                        <span key="m45-o4"><MathKatexInline math="I=0" fallback="I=0" /></span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：由 <MathKatexInline math="I=I_0\cos^2\Delta\theta" fallback="I=I₀cos²Δθ" />，且
                            <MathKatexInline math="\cos^2 45^\circ=1/2" fallback="cos²45°=1/2" />，故
                            <MathKatexInline math="I=0.5I_0" fallback="I=0.5I₀" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：透射光强遵循余弦平方规律，结合
                            <MathKatexInline math="\cos^2 45^\circ" fallback="cos²45°" /> 的数值重新判断。
                        </span>
                    ),
                },
                {
                    id: 'malus-orthogonal',
                    type: 'single',
                    prompt: (
                        <span>
                            两偏振片正交（<MathKatexInline math="\Delta\theta=90^\circ" fallback="Δθ=90°" />）时，透射光强是多少？
                        </span>
                    ),
                    options: [
                        <span key="m90-o1"><MathKatexInline math="I=I_0" fallback="I=I₀" /></span>,
                        <span key="m90-o2"><MathKatexInline math="I=0.5I_0" fallback="I=0.5I₀" /></span>,
                        <span key="m90-o3"><MathKatexInline math="I=0.1I_0" fallback="I=0.1I₀" /></span>,
                        <span key="m90-o4"><MathKatexInline math="I=0" fallback="I=0" />（完全消光）</span>,
                    ],
                    correctOptionIndex: 3,
                    successTip: (
                        <span>
                            正确：<MathKatexInline math="\cos^2 90^\circ=0" fallback="cos²90°=0" />，因此
                            <MathKatexInline math="I=0" fallback="I=0" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：正交时偏振方向互相垂直，结合
                            <MathKatexInline math="I=I_0\cos^2\Delta\theta" fallback="I=I₀cos²Δθ" /> 可知光无法正常通过。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '偏振光的电场振动方向具有选择性，理想线偏振只沿一个方向振动。',
                <span key="s2">马吕斯定律：<MathKatexInline math="I=I_0\cos^2\Delta\theta" fallback="I=I₀cos²Δθ" />。</span>,
                <span key="s3">当 <MathKatexInline math="\Delta\theta=0^\circ" fallback="Δθ=0°" /> 时透射最强；当 <MathKatexInline math="\Delta\theta=90^\circ" fallback="Δθ=90°" /> 时理想情况下完全消光。</span>,
                '自然光通过第一片偏振片后转化为线偏振光，再受第二片偏振片角度调制光强。',
            ]}
            applicationItems={[
                '偏振太阳镜利用偏振片抑制来自水面/路面的强反射眩光，提升视觉舒适度。',
                '3D 电影眼镜通过左右眼不同偏振通道分离图像，实现立体视觉重建。',
                '手机与液晶屏依赖偏振层控制光的透过与调制，形成可见图像亮暗变化。',
            ]}
        />
    );
}
