'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Alert, Chip, Skeleton, Stack, TextField } from '@mui/material';
import { SimulationPageTemplate } from '@/components/simulation-page-template';
import { MathKatexInline } from '@/components/math-katex-inline';
import { type ParameterItem } from '@/components/parameter-controls';
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500} />),
});

const MAX_THICKNESS = 20;
const MAX_CONCENTRATION = 0.1;

function computeIntensity(i0: number, epsilon: number, concentration: number, length: number) {
    return i0 * Math.pow(10, -epsilon * concentration * length);
}

function computeAbsorbance(epsilon: number, concentration: number, length: number) {
    return epsilon * concentration * length;
}

export default function Page() {
    const [i0, setI0] = React.useState<number>(1);
    const [epsilon, setEpsilon] = React.useState<number>(1000);
    const [concentration, setConcentration] = React.useState<number>(0.01);
    const [pathLength, setPathLength] = React.useState<number>(2);

    const hasError = i0 < 0 || epsilon <= 0 || pathLength <= 0;

    const thicknessAxis = React.useMemo(
        () => Array.from({ length: 401 }, (_, index) => 1 + (MAX_THICKNESS - 1) * (index / 400)),
        [],
    );
    const concentrationAxis = React.useMemo(
        () => Array.from({ length: 301 }, (_, index) => (index / 300) * MAX_CONCENTRATION),
        [],
    );

    const intensityCurve = React.useMemo(() => {
        if (hasError) return thicknessAxis.map(() => 0);
        return thicknessAxis.map((length) => computeIntensity(i0, epsilon, concentration, length));
    }, [hasError, thicknessAxis, i0, epsilon, concentration]);

    // compute intensity maximum for y-axis scaling (use a small buffer)
    const intensityMax = React.useMemo(() => {
        if (hasError) return i0 * 1.05;
        const maxVal = intensityCurve.length > 0 ? Math.max(...intensityCurve) : i0;
        return maxVal * 1.05;
    }, [intensityCurve, hasError, i0]);

    const absorbanceCurve = React.useMemo(() => {
        if (hasError) return concentrationAxis.map(() => 0);
        return concentrationAxis.map((c) => computeAbsorbance(epsilon, c, pathLength));
    }, [hasError, concentrationAxis, epsilon, pathLength]);

    const selectedIntensity = React.useMemo(() => {
        if (hasError) return 0;
        return computeIntensity(i0, epsilon, concentration, pathLength);
    }, [hasError, i0, epsilon, concentration, pathLength]);

    const selectedAbsorbance = React.useMemo(() => {
        if (hasError) return 0;
        return computeAbsorbance(epsilon, concentration, pathLength);
    }, [hasError, epsilon, concentration, pathLength]);

    // compute absorbance maximum from the curve so axis scales dynamically
    const absorbanceMax = React.useMemo(() => {
        if (hasError) return 0.1;
        // absorbanceCurve is an array of values for concentrations; take its max
        const maxVal = absorbanceCurve.length > 0 ? Math.max(...absorbanceCurve) : computeAbsorbance(epsilon, concentration, pathLength);
        return Math.max(0.1, maxVal * 1.05);
    }, [absorbanceCurve, hasError, epsilon, concentration, pathLength]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'i0',
            label: <span>入射光强 <MathKatexInline math="I_0" fallback="I0" /></span>,
            type: 'slider',
            value: i0,
            min: 0.01,
            max: 1,
            step: 0.01,
            onChange: setI0,
            tipIncrease: '调大入射光的强度，透过介质后的光强会按指数规律相应增大，整体亮度提升。',
            tipDecrease: '调小入射光的强度，透过介质后的光强会按指数规律相应减小，整体亮度降低。',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }],
        },
        {
            key: 'epsilon',
            label: <span>摩尔吸收系数 <MathKatexInline math="\\varepsilon" fallback="ε" /> (L·mol⁻¹·cm⁻¹)</span>,
            type: 'slider',
            value: epsilon,
            min: 100,
            max: 5000,
            step: 100,
            onChange: setEpsilon,
            tipIncrease: '调大介质的吸收系数，光在介质中的衰减速度会变快，相同厚度下透过的光强会变得更小。',
            tipDecrease: '调小介质的吸收系数，光的衰减速度会变慢，相同厚度下透过的光强会变得更大。',
            marks: [{ value: 100, label: '100' }, { value: 2500, label: '2500' }, { value: 5000, label: '5000' }],
        },
        {
            key: 'concentration',
            label: <span>浓度 <MathKatexInline math="c" fallback="c" /> (mol·L⁻¹)</span>,
            type: 'slider',
            value: concentration,
            min: 0.001,
            max: MAX_CONCENTRATION,
            step: 0.001,
            onChange: setConcentration,
            tipIncrease: '调大溶液浓度，吸收物质增多，透射光按指数更快减小，曲线更陡。',
            tipDecrease: '调小溶液浓度，吸收减弱，透射光更强，吸光度下降。',
            marks: [{ value: 0.001, label: '0.001' }, { value: 0.05, label: '0.05' }, { value: 0.1, label: '0.1' }],
        },
        {
            key: 'pathLength',
            label: <span>介质厚度 <MathKatexInline math="l" fallback="l" /> (cm)</span>,
            type: 'slider',
            value: pathLength,
            min: 1,
            max: MAX_THICKNESS,
            step: 1,
            onChange: setPathLength,
            tipIncrease: '调大光在介质中的传播厚度，光的衰减程度会增加，透过的光强会变小。',
            tipDecrease: '调小传播厚度，光的衰减程度会降低，透过的光强会变大。',
            marks: [{ value: 1, label: '1' }, { value: 10, label: '10' }, { value: 20, label: '20' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>选定厚度 <MathKatexInline math="l" fallback="l" /> → 透射强度</span>} variant="outlined" className="w-64" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={selectedIntensity.toFixed(4)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前浓度 <MathKatexInline math="c" fallback="c" /> → 吸光度 <MathKatexInline math="A" fallback="A" /></span>} variant="outlined" className="w-64" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={selectedAbsorbance.toFixed(4)} />
            </Stack>
            {hasError && <Alert severity="error">入射光强 ≥ 0、ε 和 l 必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: thicknessAxis,
            y: intensityCurve,
            line: { color: '#16a34a', width: 3 },
            name: 'I(l)',
            xaxis: 'x',
            yaxis: 'y',
        },
        {
            type: 'scatter',
            mode: 'markers',
            x: [pathLength],
            y: [selectedIntensity],
            marker: { color: '#16a34a', size: 12 },
            name: '当前厚度点',
            xaxis: 'x',
            yaxis: 'y',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: concentrationAxis,
            y: absorbanceCurve,
            line: { color: '#2563eb', width: 3 },
            name: 'A(c)',
            xaxis: 'x2',
            yaxis: 'y2',
        },
        {
            type: 'scatter',
            mode: 'markers',
            x: [concentration],
            y: [selectedAbsorbance],
            marker: { color: '#2563eb', size: 12 },
            name: '当前浓度点',
            xaxis: 'x2',
            yaxis: 'y2',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 34, l: 58, r: 26, b: 52 },
                xaxis: {
                    domain: [0, 0.46],
                    title: { text: '厚度 l (cm)' },
                    range: [1, MAX_THICKNESS],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: '透射光强 I(l)', standoff: 12 },
                    range: [0, intensityMax],
                    fixedrange: true,
                    side: 'left',
                },
                xaxis2: {
                    domain: [0.54, 1],
                    title: { text: '浓度 c (mol·L⁻¹)' },
                    range: [0, MAX_CONCENTRATION],
                    fixedrange: true,
                },
                yaxis2: {
                    title: { text: '吸光度 A', standoff: 12 },
                    range: [0, absorbanceMax],
                    fixedrange: true,
                    side: 'left',
                    anchor: 'x2',
                    position: 0.54,
                },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        text: 'I(l)=I0*10^{-ε c l}',
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.55,
                        y: 1.08,
                        text: 'A(c)=ε c l',
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                ],
                showlegend: true,
                legend: { orientation: 'h', x: 0.48, y: 1.16 },
            }}
        />
    );

    const presets = [
        {
            label: '🕶️墨镜滤光型',
            tip: '对应普通墨镜的滤光状态，介质的吸收系数适中，光在介质中发生中等程度的衰减，透过的光强适中，能有效过滤强光又不影响视线，是日常佩戴墨镜的效果。',
            onClick: () => { setEpsilon(800); setPathLength(2); setI0(1); setConcentration(0.02); }
        },
        {
            label: '🔴有色玻璃型',
            tip: '对应深色有色玻璃的遮光状态，介质的吸收系数大，光在介质中发生强烈衰减，透过的光强极弱，玻璃的遮光效果好，如同实验室的避光玻璃。',
            onClick: () => { setEpsilon(3200); setPathLength(2); setI0(1); setConcentration(0.08); }
        },
        {
            label: '🪟厚玻璃透光型',
            tip: '对应厚普通玻璃的透光状态，介质的吸收系数适中，但传播厚度大，光在介质中随距离发生明显衰减，透过的光强比薄玻璃弱，类似阳台厚玻璃的透光效果。',
            onClick: () => { setEpsilon(800); setPathLength(5); setI0(1); setConcentration(0.02); }
        },
    ];

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={presets}
            hint={{
                title: '光的吸收定律',
                content: (
                    <span>
                        同学们好，欢迎来到光的吸收定律实验。<br />
                        墨镜的滤光、水质浊度的检测，都遵循朗伯-比尔定律。调节介质摩尔吸收系数
                        <MathKatexInline math="\\varepsilon" fallback="ε" />、介质厚度
                        <MathKatexInline math="l" fallback="l" />，能看到透射光强的变化：吸收系数越大、介质越厚，
                        光的衰减越快，透射光强越小，理解光在介质中的指数衰减规律。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'lambert-beer-1',
                    type: 'single',
                    prompt: <span>介质厚度增加时，透射光强将如何变化？</span>,
                    options: [
                        <span key="q1-o1">透射光强呈指数衰减，厚度越大，透射光强越小</span>,
                        <span key="q1-o2">透射光强与厚度成线性正比，厚度越大越亮</span>,
                        <span key="q1-o3">透射光强先减小后增大</span>,
                        <span key="q1-o4">透射光强与厚度无关</span>,
                    ],
                    correctOptionIndex: 0,
                    successTip: <span>正确：根据 <MathKatexInline math="I=I_0e^{-\\varepsilon l}" fallback="I=I0e^-εl" />, 厚度 <MathKatexInline math="l" fallback="l" /> 增大时指数项减小，透射光强会持续下降。</span>,
                    failTip: <span>提示：介质厚度增加时，透射光强是指数衰减，不是线性变化。</span>,
                },
                {
                    id: 'lambert-beer-2',
                    type: 'single',
                    prompt: <span>当吸收系数 <MathKatexInline math="\\varepsilon" fallback="ε" /> 增大时，透射光强会如何变化？</span>,
                    options: [
                        <span key="q2-o1">吸收系数越大，衰减越慢，透射光强越大</span>,
                        <span key="q2-o2">吸收系数越大，衰减越快，透射光强越小</span>,
                        <span key="q2-o3">透射光强保持不变</span>,
                        <span key="q2-o4">透射光强只由入射光强决定，与吸收系数无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：<MathKatexInline math="\\varepsilon" fallback="ε" /> 越大，单位长度的能量损失越强，因此透射光强更小。</span>,
                    failTip: <span>提示：吸收系数越大，光在介质中的衰减速度越快，透射光强会更低。</span>,
                },
            ]}
            summaryItems={[
                '光在均匀介质中随传播距离指数衰减。',
                <span key="s2">朗伯-比尔定律：<MathKatexInline math="I=I_0e^{-\\varepsilon l}" fallback="I=I0e^-εl" />。</span>,
                <span key="s3">吸收系数 <MathKatexInline math="\\varepsilon" fallback="ε" /> 越大，衰减越快。</span>,
                <span key="s4">厚度 <MathKatexInline math="l" fallback="l" /> 越大，透射光越小。</span>,
                '可用于测量浓度、厚度、吸光度。',
            ]}
            applicationItems={[
                '有色玻璃和墨镜可利用选择性吸收削弱特定波段光强，从而实现稳定的滤光效果。',
                '水质浊度检测可通过透射光衰减程度评估介质吸收和散射综合影响。',
                '溶液浓度测量常基于朗伯-比尔定律，将透射光强变化转换为浓度定量信息。',
            ]}
        />
    );
}