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

const toRadian = (deg: number) => deg * Math.PI / 180;
const toDegree = (rad: number) => rad * 180 / Math.PI;

const normalize = (vector: [number, number]): [number, number] => {
    const len = Math.hypot(vector[0], vector[1]);
    if (len < 1e-9) return [0, 0];
    return [vector[0] / len, vector[1] / len];
};

export default function Page() {
    const nAir = 1.0;

    const [nWater, setNWater] = React.useState<number>(1.33);
    const [thetaIn, setThetaIn] = React.useState<number>(0);

    const thetaCritical = React.useMemo(
        () => toDegree(Math.asin(Math.max(0, Math.min(1, nAir / nWater)))),
        [nWater, nAir],
    );

    const isTotalInternalReflection = thetaIn > thetaCritical;

    const centerX = 0;
    const centerY = 0;
    const radius = 1;
    const interfacePolar = 140;
    const px = centerX + radius * Math.cos(toRadian(interfacePolar));
    const py = centerY + radius * Math.sin(toRadian(interfacePolar));
    const point: [number, number] = [px, py];

    const normalToAir = normalize([centerX - point[0], centerY - point[1]]);
    const tangent = normalize([-normalToAir[1], normalToAir[0]]);

    const dInc = normalize([
        Math.cos(toRadian(thetaIn)) * normalToAir[0] + Math.sin(toRadian(thetaIn)) * tangent[0],
        Math.cos(toRadian(thetaIn)) * normalToAir[1] + Math.sin(toRadian(thetaIn)) * tangent[1],
    ]);

    const incidentLength = 2.2;
    const incidentStart: [number, number] = [
        point[0] - incidentLength * dInc[0],
        point[1] - incidentLength * dInc[1],
    ];

    const dRef = normalize([
        -Math.cos(toRadian(thetaIn)) * normalToAir[0] + Math.sin(toRadian(thetaIn)) * tangent[0],
        -Math.cos(toRadian(thetaIn)) * normalToAir[1] + Math.sin(toRadian(thetaIn)) * tangent[1],
    ]);
    const reflectedEnd: [number, number] = [
        point[0] + 1.8 * dRef[0],
        point[1] + 1.8 * dRef[1],
    ];

    const refractedEnd: [number, number] | null = (() => {
        const sinThetaT = nWater * Math.sin(toRadian(thetaIn));
        if (Math.abs(sinThetaT) > 1) return null;
        const thetaT = Math.asin(Math.max(-1, Math.min(1, sinThetaT)));
        const dTrans = normalize([
            Math.cos(thetaT) * normalToAir[0] + Math.sin(thetaT) * tangent[0],
            Math.cos(thetaT) * normalToAir[1] + Math.sin(thetaT) * tangent[1],
        ]);
        return [point[0] + 1.4 * dTrans[0], point[1] + 1.4 * dTrans[1]];
    })();

    const normalStart: [number, number] = [
        point[0] - normalToAir[0],
        point[1] - normalToAir[1],
    ];
    const normalEnd: [number, number] = [
        point[0] + normalToAir[0],
        point[1] + normalToAir[1],
    ];

    const circleAngles = React.useMemo(() => Array.from({ length: 361 }, (_, i) => i), []);
    const bubbleX = React.useMemo(
        () => circleAngles.map((deg) => centerX + radius * Math.cos(toRadian(deg))),
        [circleAngles],
    );
    const bubbleY = React.useMemo(
        () => circleAngles.map((deg) => centerY + radius * Math.sin(toRadian(deg))),
        [circleAngles],
    );

    const parameterItems: ParameterItem[] = [
        {
            key: 'nWater',
            label: <span>水折射率 <MathKatexInline math="n_1" fallback="n₁" /></span>,
            type: 'slider',
            value: nWater,
            min: 1.30,
            max: 1.40,
            step: 0.001,
            onChange: setNWater,
            tipIncrease: '调大水的折射率，水中气泡全反射的临界角会变小，气泡更易发生全反射而发亮。',
            tipDecrease: '调小水的折射率，临界角会变大，气泡更难发生全反射，透光性更强。',
            marks: [
                { value: 1.30, label: '1.30' },
                { value: 1.33, label: '1.33' },
                { value: 1.40, label: '1.40' },
            ],
        },
        {
            key: 'thetaIn',
            label: <span>入射角 <MathKatexInline math="\\theta_i" fallback="θᵢ" /> (°)</span>,
            type: 'slider',
            value: thetaIn,
            min: 0,
            max: 80,
            step: 0.1,
            onChange: setThetaIn,
            tipIncrease: '调大光线的入射角，当入射角超过临界角时，气泡会从透光变为完全全反射，亮度大幅提升。',
            tipDecrease: '调小光线的入射角，气泡会从全反射变为透光，亮度降低。',
            marks: [
                { value: 0, label: '0' },
                { value: 48.8, label: '48.8' },
                { value: 80, label: '80' },
            ],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>空气折射率 <MathKatexInline math="n_2" fallback="n₂" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={nAir.toFixed(2)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>临界角 <MathKatexInline math="\\theta_c" fallback="θc" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={thetaCritical.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="当前状态" variant="outlined" className="w-56" />
                <TextField
                    disabled
                    hiddenLabel
                    size="small"
                    variant="standard"
                    value={isTotalInternalReflection ? '全反射（镜面反光）' : '折射为主'}
                />
            </Stack>
        </>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: bubbleX,
            y: bubbleY,
            line: { color: '#111827', width: 2 },
            name: '气泡边界',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [normalStart[0], normalEnd[0]],
            y: [normalStart[1], normalEnd[1]],
            line: { color: '#6b7280', width: 2, dash: 'dot' },
            name: '法线',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [incidentStart[0], point[0]],
            y: [incidentStart[1], point[1]],
            line: { color: '#2563eb', width: 4 },
            name: '入射光（水→气泡）',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [point[0], reflectedEnd[0]],
            y: [point[1], reflectedEnd[1]],
            line: { color: '#16a34a', width: 4 },
            name: '反射光（水中）',
            visible: isTotalInternalReflection ? true : 'legendonly',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: refractedEnd ? [point[0], refractedEnd[0]] : [point[0]],
            y: refractedEnd ? [point[1], refractedEnd[1]] : [point[1]],
            line: { color: '#dc2626', width: 4 },
            name: '折射光（入气泡）',
            visible: isTotalInternalReflection ? 'legendonly' : true,
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 20, l: 20, r: 20, b: 20 },
                xaxis: { range: [-2.2, 2.2], visible: false, fixedrange: true },
                yaxis: { range: [-1.8, 1.8], visible: false, scaleanchor: 'x', scaleratio: 1, fixedrange: true },
                annotations: [
                    {
                        x: -1.9,
                        y: 1.55,
                        text: `水 n=${nWater.toFixed(3)}`,
                        showarrow: false,
                    },
                    {
                        x: 0,
                        y: 0,
                        text: '空气 n≈1.00',
                        showarrow: false,
                    },
                    {
                        x: 1.4,
                        y: 1.55,
                        text: isTotalInternalReflection ? '状态：镜面反光' : '状态：折射透入',
                        showarrow: false,
                        font: { color: isTotalInternalReflection ? '#dc2626' : '#16a34a' },
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `sinθc=n2/n1 | θc=${thetaCritical.toFixed(2)}° | θi=${thetaIn.toFixed(1)}°`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                ],
                showlegend: true,
                legend: { orientation: 'h', x: 0.05, y: 1.08 },
            }}
        />
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                {
                    label: '💧水泡透光型',
                    tip: '对应水中小气泡的日常透光状态，光线入射角较小，气泡部分透光、部分反光，气泡在水中呈现淡透明状，和平时看水中普通气泡的效果一致。',
                    onClick: () => {
                        setNWater(1.33);
                        setThetaIn(0);
                    },
                },
                {
                    label: '🌟临界反光型',
                    tip: '对应水中气泡达到全反射临界角的状态，气泡的反光强度大幅提升，边缘开始变得明亮，是气泡从透光到完全反光的临界状态，稍改变光线角度就会完全发亮。',
                    onClick: () => {
                        setNWater(1.33);
                        setThetaIn(48.8);
                    },
                },
                {
                    label: '✨水泡发亮型',
                    tip: '对应水中气泡完全全反射的状态，光线入射角大于临界角，气泡无透光，全部光线发生反射，气泡在水中像小镜子一样明亮，类似开水里的气泡反光效果。',
                    onClick: () => {
                        setNWater(1.33);
                        setThetaIn(55);
                    },
                },
            ]}
            hint={{
                title: '水中气泡全反射',
                content: (
                    <span>
                        同学们好，欢迎来到水中气泡全反射实验。<br />
                        水下气泡的发亮反光、喷泉中的水珠闪光，都是水中气泡的全反射现象。调节入射光角度
                        <MathKatexInline math="\theta" fallback="θ" />（水的折射率固定1.33），当角度超过
                        <MathKatexInline math="48.8^\circ" fallback="48.8°" /> 的临界角时，气泡会像小镜子一样全反射发光，直观感受生活中常见的全反射场景。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'bubble-tir-medium-order',
                    type: 'single',
                    prompt: (
                        <span>
                            光从水射入气泡时，满足哪种全反射条件？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">光从光疏介质射向光密介质，且 <MathKatexInline math="n_1<n_2" fallback="n₁<n₂" /></span>,
                        <span key="q1-o2">光从光密介质（水）射向光疏介质（空气），且 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" /></span>,
                        <span key="q1-o3">两侧折射率必须相等，即 <MathKatexInline math="n_1=n_2" fallback="n₁=n₂" /></span>,
                        <span key="q1-o4">只要有界面就一定全反射，与折射率无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：水相对空气是光密介质，满足 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" /> 是全反射前提之一。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：水和空气的折射率不同，需判断哪种是光密介质、哪种是光疏介质。
                        </span>
                    ),
                },
                {
                    id: 'bubble-bright-appearance',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射角 <MathKatexInline math="\\theta_i" fallback="θᵢ" /> 大于临界角 <MathKatexInline math="\\theta_c" fallback="θc" /> 时，气泡看起来会怎样？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">气泡完全透明，不会反光</span>,
                        <span key="q2-o2">气泡表面像镜子一样，呈现明亮反光</span>,
                        <span key="q2-o3">气泡边界消失，无法观察</span>,
                        <span key="q2-o4">气泡只会变暗，不会有镜面效果</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：当 <MathKatexInline math="\\theta_i>\\theta_c" fallback="θᵢ>θc" /> 时发生全反射，界面反射增强，常呈镜面般明亮。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：入射角大于临界角时，气泡表面会产生类似镜面的反射效果。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">在水-空气界面中，水折射率约为 <MathKatexInline math="n_1\approx1.33" fallback="n₁≈1.33" />，空气约为 <MathKatexInline math="n_2=1" fallback="n₂=1" />，满足光密到光疏传播。</span>,
                <span key="s2">临界角由 <MathKatexInline math="\\sin\\theta_c=\\frac{n_2}{n_1}" fallback="sinθc=n₂/n₁" /> 决定，水-空气典型值约 <MathKatexInline math="\\theta_c\approx48.8^\\circ" fallback="θc≈48.8°" />。</span>,
                <span key="s3">当 <MathKatexInline math="\\theta_i>48.8^\\circ" fallback="θᵢ>48.8°" /> 时，折射光消失并发生全反射。</span>,
                '由于反射占主导，气泡边界会像小镜子一样发亮，尤其在斜视角和强光环境下更明显。',
            ]}
            applicationItems={[
                '水下气泡发亮：潜水或搅动水体时，大角度入射光在气泡表面全反射，形成亮边和闪点。',
                '开水气泡：沸腾时大量微气泡不断产生，全反射与散射叠加让液面出现跳动的高亮纹理。',
                '喷泉反光：细小水滴与气泡群在阳光下产生强反射，提升喷泉的“闪烁感”和可见度。',
            ]}
        />
    );
}
