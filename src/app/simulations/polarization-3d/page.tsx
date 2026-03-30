'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'),
    { ssr: false, loading: () => (<Skeleton width={860} height={500} />) },
);

const toRadian = (deg: number) => deg * Math.PI / 180;

export default function Page() {
    const [alphaDeg, setAlphaDeg] = React.useState<number>(0);
    const [betaDeg, setBetaDeg] = React.useState<number>(90);
    const [gammaDeg, setGammaDeg] = React.useState<number>(45);

    const i0 = 1;

    const leftIntensity = React.useMemo(
        () => i0 * Math.pow(Math.cos(toRadian(gammaDeg - alphaDeg)), 2),
        [i0, gammaDeg, alphaDeg],
    );

    const rightIntensity = React.useMemo(
        () => i0 * Math.pow(Math.cos(toRadian(gammaDeg - betaDeg)), 2),
        [i0, gammaDeg, betaDeg],
    );

    const parameterItems: ParameterItem[] = [
        {
            key: 'alphaDeg',
            label: <span>左眼偏振角 <MathKatexInline math="\\alpha" fallback="α" /> (°)</span>,
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
            label: <span>右眼偏振角 <MathKatexInline math="\\beta" fallback="β" /> (°)</span>,
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
            key: 'gammaDeg',
            label: <span>入射偏振角 <MathKatexInline math="\\gamma" fallback="γ" /> (°)</span>,
            type: 'slider',
            value: gammaDeg,
            min: 0,
            max: 180,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setGammaDeg,
            marks: [{ value: 0, label: '0' }, { value: 90, label: '90' }, { value: 180, label: '180' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>左眼光强 <MathKatexInline math="I_{\text{左}}" fallback="I左" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={leftIntensity.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>右眼光强 <MathKatexInline math="I_{\text{右}}" fallback="I右" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={rightIntensity.toFixed(5)} />
            </Stack>
        </>
    );

    const traces: Data[] = [
        {
            type: "bar",
            x: ["左眼", "右眼"],
            y: [leftIntensity, rightIntensity],
            marker: { color: ["#2563eb", "#16a34a"] },
            name: '眼通道光强',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 24, l: 64, r: 24, b: 50 },
                xaxis: { title: { text: "通道" }, fixedrange: true },
                yaxis: {
                    title: { text: "透射光强" },
                    range: [0, 1.05],
                    showline: true,
                    linewidth: 2,
                    ticks: "outside",
                    tickwidth: 2,
                    fixedrange: true,
                },
                annotations: [
                    {
                        x: "左眼",
                        y: leftIntensity,
                        text: leftIntensity.toFixed(3),
                        showarrow: false,
                        yshift: 14,
                    },
                    {
                        x: "右眼",
                        y: rightIntensity,
                        text: rightIntensity.toFixed(3),
                        showarrow: false,
                        yshift: 14,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `I左=I0·cos²(γ-α), I右=I0·cos²(γ-β) | α=${alphaDeg.toFixed(0)}°, β=${betaDeg.toFixed(0)}°, γ=${gammaDeg.toFixed(0)}°`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                ],
                showlegend: false,
            }}
        />
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                {
                    label: '标准3D',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(90);
                        setGammaDeg(45);
                    },
                },
                {
                    label: '左眼可见',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(90);
                        setGammaDeg(0);
                    },
                },
                {
                    label: '右眼可见',
                    onClick: () => {
                        setAlphaDeg(0);
                        setBetaDeg(90);
                        setGammaDeg(90);
                    },
                },
            ]}
            hint={{
                title: '3D 眼镜偏振分离',
                content: (
                    <span>
                        同学们好，欢迎来到3D 眼镜偏振分离实验。<br />
                        3D电影的立体画面、VR设备的沉浸式显示，靠的是3D眼镜的偏振原理。调节左右偏振片夹角、入射光偏振角
                        <MathKatexInline math="\gamma" fallback="γ" />，能看到左右眼的通光效果：夹角
                        <MathKatexInline math="90^\circ" fallback="90°" /> 时左右眼接收独立画面，旋转头部改变偏振角则会出现重影，理解立体视觉的形成原理。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: '3d-orthogonal-polarizers',
                    type: 'single',
                    prompt: (
                        <span>
                            标准 3D 眼镜左右镜片偏振方向关系应满足什么条件？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">两镜片偏振方向平行</span>,
                        <span key="q1-o2">左右镜片偏振方向互相垂直</span>,
                        <span key="q1-o3">两镜片偏振方向随机变化</span>,
                        <span key="q1-o4">两镜片偏振方向始终相同且旋转</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：左右镜片偏振方向互相垂直，才能让左右眼接收互不干扰的独立画面。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：标准 3D 眼镜需让左右眼接收独立画面，偏振方向必须满足互不干扰条件。
                        </span>
                    ),
                },
                {
                    id: '3d-45deg-input-intensity',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射光偏振角 <MathKatexInline math="\gamma=45^\circ" fallback="γ=45°" />，且
                            <MathKatexInline math="\alpha=0^\circ,\ \beta=90^\circ" fallback="α=0°, β=90°" /> 时，左右眼接收光强关系是什么？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">左眼更强，右眼更弱</span>,
                        <span key="q2-o2">右眼更强，左眼更弱</span>,
                        <span key="q2-o3">两眼光强相等，均为 <MathKatexInline math="0.5I_0" fallback="0.5I₀" /></span>,
                        <span key="q2-o4">两眼都为 0（完全消光）</span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: (
                        <span>
                            正确：由马吕斯定律可得
                            <MathKatexInline math="I_{\text{左}}=I_0\cos^2(45^\circ)=0.5I_0" fallback="I左=0.5I₀" />
                            ，
                            <MathKatexInline math="I_{\text{右}}=I_0\cos^2(45^\circ)=0.5I_0" fallback="I右=0.5I₀" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：<MathKatexInline math="45^\circ" fallback="45°" /> 偏振入射时，结合马吕斯定律
                            <MathKatexInline math="I=I_0\cos^2\Delta\theta" fallback="I=I₀cos²Δθ" />，两眼应保持对称。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '标准 3D 偏振方案中，左右眼分析器偏振方向互相垂直，用于分离左右画面通道。',
                '左右眼接收独立画面后由大脑进行融合，形成深度知觉与立体视觉。',
                <span key="s3">左眼强度关系：<MathKatexInline math="I_{\text{左}}=I_0\cos^2(\gamma-\alpha)" fallback="I左=I₀cos²(γ-α)" />。</span>,
                '头部旋转会改变有效偏振关系，导致通道串扰增强，从而出现重影或立体感下降。',
            ]}
            applicationItems={[
                '3D 电影通过双通道偏振投影把左右图像叠加到同一屏幕，再由眼镜完成通道分离。',
                '立体投影系统可在教学与展览中输出双视角画面，借助偏振器实现多人同时观看。',
                'VR 显示中的偏振管理用于提升光路效率和串扰控制，改善左右眼画面独立性。',
            ]}
        />
    );
}
