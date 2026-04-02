'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Chip, Skeleton, Stack, TextField } from '@mui/material';
import { SimulationPageTemplate } from '@/components/simulation-page-template';
import { MathKatexInline } from '@/components/math-katex-inline';
import { type ParameterItem } from '@/components/parameter-controls';
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500} />),
});

const MIN_ALPHA_SLIDER = 0.1;
const MAX_ALPHA_SLIDER = 2.0;
const MIN_PATH_LENGTH = 0.5;
const MAX_PATH_LENGTH = 10;
const MIN_WAVELENGTH = 400;
const MAX_WAVELENGTH = 700;

function computeEffectiveAlpha(alpha: number, wavelength: number) {
    return alpha + 0.01 * (400 - wavelength);
}

function computeIntensity(i0: number, alpha: number, length: number) {
    return i0 * Math.exp(-alpha * length);
}

function computeAbsorbance(alpha: number, length: number) {
    return alpha * length;
}

export default function Page() {
    const [i0, setI0] = React.useState<number>(1);
    const [alpha, setAlpha] = React.useState<number>(1.5);
    const [pathLength, setPathLength] = React.useState<number>(4);
    const [wavelength, setWavelength] = React.useState<number>(450);

    const hasParamError = alpha <= 0 || pathLength <= 0 || wavelength <= 0;
    const effectiveAlpha = React.useMemo(() => computeEffectiveAlpha(alpha, wavelength), [alpha, wavelength]);
    const hasNonPhysicalAlpha = effectiveAlpha <= 0;

    const pathAxis = React.useMemo(
        () => Array.from({ length: 401 }, (_, index) => (MAX_PATH_LENGTH * index) / 400),
        [],
    );

    const intensityCurve = React.useMemo(() => {
        if (hasParamError) return pathAxis.map(() => 0);
        return pathAxis.map((length) => computeIntensity(i0, effectiveAlpha, length));
    }, [hasParamError, pathAxis, i0, effectiveAlpha]);

    const absorbanceCurve = React.useMemo(() => {
        if (hasParamError) return pathAxis.map(() => 0);
        return pathAxis.map((length) => computeAbsorbance(effectiveAlpha, length));
    }, [hasParamError, pathAxis, effectiveAlpha]);

    const selectedIntensity = React.useMemo(() => {
        if (hasParamError) return 0;
        return computeIntensity(i0, effectiveAlpha, pathLength);
    }, [hasParamError, i0, effectiveAlpha, pathLength]);

    const selectedAbsorbance = React.useMemo(() => {
        if (hasParamError) return 0;
        return computeAbsorbance(effectiveAlpha, pathLength);
    }, [hasParamError, effectiveAlpha, pathLength]);

    const absorbanceMin = React.useMemo(() => Math.min(...absorbanceCurve, 0), [absorbanceCurve]);
    const absorbanceMax = React.useMemo(() => Math.max(...absorbanceCurve, 0.2), [absorbanceCurve]);

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
            tipIncrease: '调大入射光强，透过介质后的光强会整体升高，但衰减规律不变。',
            tipDecrease: '调小入射光强，透过介质后的光强会整体降低，但衰减规律不变。',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }],
        },
        {
            key: 'alpha',
            label: <span>基础吸收系数 <MathKatexInline math="\\alpha" fallback="alpha" /> (cm⁻¹)</span>,
            type: 'slider',
            value: alpha,
            min: MIN_ALPHA_SLIDER,
            max: MAX_ALPHA_SLIDER,
            step: 0.1,
            onChange: setAlpha,
            tipIncrease: '调大介质的吸收系数，光在介质中的衰减速度会变快，相同厚度下透过的光强会变得更小。',
            tipDecrease: '调小介质的吸收系数，光的衰减速度会变慢，相同厚度下透过的光强会变得更大。',
            marks: [{ value: 0.1, label: '0.1' }, { value: 1.0, label: '1.0' }, { value: 2.0, label: '2.0' }],
        },
        {
            key: 'pathLength',
            label: <span>介质光程 <MathKatexInline math="l" fallback="l" /> (cm)</span>,
            type: 'slider',
            value: pathLength,
            min: MIN_PATH_LENGTH,
            max: MAX_PATH_LENGTH,
            step: 0.1,
            onChange: setPathLength,
            tipIncrease: '调大光在介质中的光程，光的衰减程度会增加，透过的光强会变小。',
            tipDecrease: '调小光在介质中的光程，光的衰减程度会降低，透过的光强会变大。',
            marks: [{ value: 0.5, label: '0.5' }, { value: 5, label: '5' }, { value: 10, label: '10' }],
        },
        {
            key: 'wavelength',
            label: <span>入射可见光波长 <MathKatexInline math="\\lambda" fallback="lambda" /> (nm)</span>,
            type: 'slider',
            value: wavelength,
            min: MIN_WAVELENGTH,
            max: MAX_WAVELENGTH,
            step: 1,
            onChange: setWavelength,
            tipIncrease: '调大入射光波长，等效吸收系数会降低，透射光衰减会减弱，吸光度随光程的增长会变慢。',
            tipDecrease: '调小入射光波长，等效吸收系数会升高，透射光衰减会加快，吸光度随光程的增长会变快。',
            marks: [{ value: 400, label: '400' }, { value: 550, label: '550' }, { value: 700, label: '700' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前等效吸收系数 <MathKatexInline math="\\alpha(\\lambda)" fallback="alpha(lambda)" /></span>} variant="outlined" className="w-64" />
                <TextField
                    disabled
                    hiddenLabel
                    size="small"
                    variant="standard"
                    value={hasNonPhysicalAlpha ? '吸收系数不能为负' : `${effectiveAlpha.toFixed(4)} cm⁻¹`}
                />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前透射光强 <MathKatexInline math="I" fallback="I" /></span>} variant="outlined" className="w-64" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={selectedIntensity.toFixed(4)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前吸光度 <MathKatexInline math="A" fallback="A" /></span>} variant="outlined" className="w-64" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={selectedAbsorbance.toFixed(4)} />
            </Stack>
        </Stack>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: pathAxis,
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
            x: pathAxis,
            y: absorbanceCurve,
            line: { color: '#2563eb', width: 3 },
            name: 'A(l)',
            xaxis: 'x2',
            yaxis: 'y2',
        },
        {
            type: 'scatter',
            mode: 'markers',
            x: [pathLength],
            y: [selectedAbsorbance],
            marker: { color: '#2563eb', size: 12 },
            name: '当前光程点',
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
                    title: { text: '光程 l (cm)' },
                    range: [0, MAX_PATH_LENGTH],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: '归一透射光强 I(l)', standoff: 12 },
                    range: [0, i0],
                    fixedrange: true,
                    side: 'left',
                },
                xaxis2: {
                    domain: [0.54, 1],
                    title: { text: '光程 l (cm)' },
                    range: [0, MAX_PATH_LENGTH],
                    fixedrange: true,
                },
                yaxis2: {
                    title: { text: '吸光度 A', standoff: 12 },
                    range: [absorbanceMin * 1.05, absorbanceMax * 1.05],
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
                        text: 'I(l)=I₀·exp(-α(λ)·l)',
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
                        text: 'A(l)=ln(I₀/I)=α(λ)·l',
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
            onClick: () => { setAlpha(1.4); setPathLength(2); setI0(1); setWavelength(460); }
        },
        {
            label: '🔴有色玻璃型',
            tip: '对应深色有色玻璃的遮光状态，介质的吸收系数大，光在介质中发生强烈衰减，透过的光强极弱，玻璃的遮光效果好，如同实验室的避光玻璃。',
            onClick: () => { setAlpha(1.9); setPathLength(2); setI0(1); setWavelength(420); }
        },
        {
            label: '🪟厚玻璃透光型',
            tip: '对应厚普通玻璃的透光状态，介质的吸收系数适中，但传播厚度大，光在介质中随距离发生明显衰减，透过的光强比薄玻璃弱，类似阳台厚玻璃的透光效果。',
            onClick: () => { setAlpha(1.4); setPathLength(5); setI0(1); setWavelength(460); }
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
                        墨镜的滤光、水质浊度的检测，都遵循朗伯-比尔定律。调节介质等效吸收系数
                        <MathKatexInline math="\\alpha(\\lambda)" fallback="alpha(lambda)" />、介质厚度
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
                    prompt: <span>当等效吸收系数 <MathKatexInline math="\\alpha(\\lambda)" fallback="alpha(lambda)" /> 增大时，透射光强会如何变化？</span>,
                    options: [
                        <span key="q2-o1">吸收系数越大，衰减越慢，透射光强越大</span>,
                        <span key="q2-o2">吸收系数越大，衰减越快，透射光强越小</span>,
                        <span key="q2-o3">透射光强保持不变</span>,
                        <span key="q2-o4">透射光强只由入射光强决定，与吸收系数无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：<MathKatexInline math="\\alpha(\\lambda)" fallback="alpha(lambda)" /> 越大，单位长度的能量损失越强，因此透射光强更小。</span>,
                    failTip: <span>提示：吸收系数越大，光在介质中的衰减速度越快，透射光强会更低。</span>,
                },
            ]}
            summaryItems={[
                '光在均匀介质中随传播距离指数衰减。',
                <span key="s2">朗伯-比尔定律：<MathKatexInline math="I=I_0e^{-\\alpha(\\lambda)l}" fallback="I=I0e^-alpha(lambda)l" />。</span>,
                <span key="s3">吸收系数 <MathKatexInline math="\\alpha(\\lambda)" fallback="alpha(lambda)" /> 越大，衰减越快。</span>,
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