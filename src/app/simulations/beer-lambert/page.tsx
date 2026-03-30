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

const COLOR_SEGMENT_SIZE = 12;

function wavelengthToColor(lambdaNm: number): string {
    if (!Number.isFinite(lambdaNm)) return '#64748b';
    const clamped = Math.max(380, Math.min(700, lambdaNm));
    const hue = ((700 - clamped) / (700 - 380)) * 240;
    return `hsl(${hue}, 90%, 45%)`;
}

function calcAlphaLambda(alpha0: number, lambdaNm: number) {
    return Math.max(0.01, alpha0 + 0.01 * (400 - lambdaNm));
}

export default function Page() {
    const [alpha0, setAlpha0] = React.useState<number>(0.5);
    const [thicknessCm, setThicknessCm] = React.useState<number>(2);
    const [i0, setI0] = React.useState<number>(1);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);

    const alphaLambda = React.useMemo(() => calcAlphaLambda(alpha0, lambdaNm), [alpha0, lambdaNm]);
    const hasError = alpha0 <= 0 || thicknessCm <= 0;

    const outIntensity = React.useMemo(() => {
        if (hasError) return 0;
        return i0 * Math.exp(-alphaLambda * thicknessCm);
    }, [hasError, i0, alphaLambda, thicknessCm]);

    const attenuationPct = i0 > 1e-9 ? (1 - outIntensity / i0) * 100 : 0;

    const lAxis = React.useMemo(() => Array.from({ length: 401 }, (_, i) => i * 0.025), []);
    const intensityCurve = React.useMemo(() => {
        if (hasError) return lAxis.map(() => 0);
        return lAxis.map((l) => i0 * Math.exp(-alphaLambda * l));
    }, [hasError, lAxis, i0, alphaLambda]);

    const lambdaAxis = React.useMemo(() => Array.from({ length: 301 }, (_, i) => 400 + i), []);
    const alphaCurve = React.useMemo(() => lambdaAxis.map((lam) => calcAlphaLambda(alpha0, lam)), [lambdaAxis, alpha0]);

    const coloredLambdaSegments = React.useMemo<Data[]>(() => {
        const segments: Data[] = [];
        for (let start = 0; start < lambdaAxis.length - 1; start += COLOR_SEGMENT_SIZE) {
            const end = Math.min(start + COLOR_SEGMENT_SIZE, lambdaAxis.length - 1);
            const segX = lambdaAxis.slice(start, end + 1);
            const segY = alphaCurve.slice(start, end + 1);
            const midLambda = segX[Math.floor(segX.length / 2)];

            segments.push({
                type: 'scatter',
                mode: 'lines',
                x: segX,
                y: segY,
                line: { color: wavelengthToColor(midLambda), width: 3 },
                xaxis: 'x2',
                yaxis: 'y2',
                hoverinfo: 'skip',
                showlegend: false,
            });
        }
        return segments;
    }, [lambdaAxis, alphaCurve]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'alpha0',
            label: <span>吸收系数 <MathKatexInline math="\\alpha_0" fallback="α0" /> (cm⁻¹)</span>,
            type: 'slider',
            value: alpha0,
            min: 0.1,
            max: 2,
            step: 0.01,
            onChange: setAlpha0,
            tipIncrease: '调大介质的吸收系数，光在介质中的衰减速度会变快，相同厚度下透过的光强会变得更小。',
            tipDecrease: '调小介质的吸收系数，光的衰减速度会变慢，相同厚度下透过的光强会变得更大。',
            marks: [{ value: 0.1, label: '0.1' }, { value: 1, label: '1.0' }, { value: 2, label: '2.0' }],
        },
        {
            key: 'thicknessCm',
            label: <span>介质厚度 <MathKatexInline math="l" fallback="l" /> (cm)</span>,
            type: 'slider',
            value: thicknessCm,
            min: 0.5,
            max: 10,
            step: 0.1,
            onChange: setThicknessCm,
            tipIncrease: '调大光在介质中的传播厚度，光的衰减程度会增加，透过的光强会变小。',
            tipDecrease: '调小传播厚度，光的衰减程度会降低，透过的光强会变大。',
            marks: [{ value: 0.5, label: '0.5' }, { value: 5, label: '5.0' }, { value: 10, label: '10' }],
        },
        {
            key: 'i0',
            label: <span>入射光强 <MathKatexInline math="I_0" fallback="I0" /></span>,
            type: 'slider',
            value: i0,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setI0,
            tipIncrease: '调大入射光的强度，透过介质后的光强会按指数规律相应增大，整体亮度提升。',
            tipDecrease: '调小入射光的强度，透过介质后的光强会按指数规律相应减小，整体亮度降低。',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }],
        },
        {
            key: 'lambdaNm',
            label: <span>波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
            type: 'slider',
            value: lambdaNm,
            min: 400,
            max: 700,
            step: 1,
            onChange: setLambdaNm,
            
            marks: [{ value: 400, label: '400' }, { value: 550, label: '550' }, { value: 700, label: '700' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>出射光强 <MathKatexInline math="I" fallback="I" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={outIntensity.toFixed(4)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="衰减率 (%)" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={attenuationPct.toFixed(2)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>实时吸收系数 <MathKatexInline math="\\alpha(\\lambda)" fallback="α(λ)" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={alphaLambda.toFixed(4)} />
            </Stack>
            {hasError && <Alert severity="error">吸收系数/介质厚度必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: lAxis,
            y: intensityCurve,
            line: { color: '#16a34a', width: 3 },
            xaxis: 'x',
            yaxis: 'y',
            name: 'I(l)',
        },
        ...coloredLambdaSegments,
        {
            type: 'scatter',
            mode: 'lines',
            x: [null],
            y: [null],
            line: { color: wavelengthToColor(lambdaNm), width: 3 },
            xaxis: 'x2',
            yaxis: 'y2',
            name: 'α(λ)',
            hoverinfo: 'skip',
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
                xaxis: { domain: [0, 0.46], title: { text: '厚度 l (cm)' }, range: [0, 10], fixedrange: true },
                yaxis: { title: { text: '光强 I' }, range: [0, 1.02], fixedrange: true },
                xaxis2: { domain: [0.55, 1], title: { text: '波长 λ (nm)' }, range: [400, 700], fixedrange: true },
                yaxis2: { title: { text: '吸收系数 α(λ)' }, fixedrange: true },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        text: `I=I0·exp(-αd), α(λ)=${alphaLambda.toFixed(3)}`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                ],
                showlegend: true,
                legend: { orientation: 'h', x: 0.02, y: 1.16 },
            }}
        />
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                {
                    label: '🕶️墨镜滤光型',
                    tip: '对应普通墨镜的滤光状态，介质的吸收系数适中，光在介质中发生中等程度的衰减，透过的光强适中，能有效过滤强光又不影响视线，是日常佩戴墨镜的效果。',
                    onClick: () => { setAlpha0(0.5); setThicknessCm(2); setI0(1); setLambdaNm(550); }
                },
                {
                    label: '🔴有色玻璃型',
                    tip: '对应深色有色玻璃的遮光状态，介质的吸收系数大，光在介质中发生强烈衰减，透过的光强极弱，玻璃的遮光效果好，如同实验室的避光玻璃。',
                    onClick: () => { setAlpha0(2.0); setThicknessCm(2); setI0(1); setLambdaNm(550); }
                },
                {
                    label: '🪟厚玻璃透光型',
                    tip: '对应厚普通玻璃的透光状态，介质的吸收系数适中，但传播厚度大，光在介质中随距离发生明显衰减，透过的光强比薄玻璃弱，类似阳台厚玻璃的透光效果。',
                    onClick: () => { setAlpha0(0.5); setThicknessCm(5); setI0(1); setLambdaNm(550); }
                },
            ]}
            hint={{
                title: '光的吸收定律',
                content: (
                    <span>
                        同学们好，欢迎来到光的吸收定律实验。<br />
                        墨镜的滤光、水质浊度的检测，都遵循朗伯-比尔定律。调节介质吸收系数
                        <MathKatexInline math="\\alpha" fallback="α" />、介质厚度
                        <MathKatexInline math="d" fallback="d" />，能看到透射光强的变化：吸收系数越大、介质越厚，
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
                    successTip: <span>正确：根据 <MathKatexInline math="I=I_0e^{-\\alpha d}" fallback="I=I0e^-αd" />，厚度 d 增大时指数项减小，透射光强会持续下降。</span>,
                    failTip: <span>提示：介质厚度增加时，透射光强是指数衰减，不是线性变化。</span>,
                },
                {
                    id: 'lambert-beer-2',
                    type: 'single',
                    prompt: <span>当吸收系数 <MathKatexInline math="\\alpha" fallback="α" /> 增大时，透射光强会如何变化？</span>,
                    options: [
                        <span key="q2-o1">吸收系数越大，衰减越慢，透射光强越大</span>,
                        <span key="q2-o2">吸收系数越大，衰减越快，透射光强越小</span>,
                        <span key="q2-o3">透射光强保持不变</span>,
                        <span key="q2-o4">透射光强只由入射光强决定，与吸收系数无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：<MathKatexInline math="\\alpha" fallback="α" /> 越大，单位长度的能量损失越强，因此透射光强更小。</span>,
                    failTip: <span>提示：吸收系数越大，光在介质中的衰减速度越快，透射光强会更低。</span>,
                },
            ]}
            summaryItems={[
                '光在均匀介质中随传播距离指数衰减。',
                <span key="s2">朗伯-比尔定律：<MathKatexInline math="I=I_0e^{-\\alpha d}" fallback="I=I0e^-αd" />。</span>,
                <span key="s3">吸收系数 <MathKatexInline math="\\alpha" fallback="α" /> 越大，衰减越快。</span>,
                <span key="s4">厚度 <MathKatexInline math="d" fallback="d" /> 越大，透射光越小。</span>,
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
