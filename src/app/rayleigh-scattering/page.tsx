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

const COLOR_SEGMENT_SIZE = 10;

function wavelengthToColor(lambdaNm: number): string {
    if (!Number.isFinite(lambdaNm)) return '#64748b';
    const clamped = Math.max(380, Math.min(700, lambdaNm));
    const hue = ((700 - clamped) / (700 - 380)) * 240;
    return `hsl(${hue}, 90%, 45%)`;
}

function scatteringIntensity(i0: number, n: number, lambdaNm: number, thetaDeg: number) {
    const nNorm = n / 1e16;
    const lambdaFactor = Math.pow(400 / lambdaNm, 4);
    const theta = thetaDeg * Math.PI / 180;
    const angular = 1 + Math.cos(theta) * Math.cos(theta);
    return i0 * 0.12 * nNorm * lambdaFactor * angular;
}

export default function Page() {
    const [particleN, setParticleN] = React.useState<number>(3e16);
    const [lambdaNm, setLambdaNm] = React.useState<number>(500);
    const [i0, setI0] = React.useState<number>(1);
    const [thetaDeg, setThetaDeg] = React.useState<number>(90);

    const hasError = particleN <= 0 || lambdaNm <= 0;

    const isValue = React.useMemo(() => {
        if (hasError) return 0;
        return scatteringIntensity(i0, particleN, lambdaNm, thetaDeg);
    }, [hasError, i0, particleN, lambdaNm, thetaDeg]);

    const iTrans = React.useMemo(() => {
        if (hasError) return 0;
        const loss90 = scatteringIntensity(i0, particleN, lambdaNm, 90);
        return Math.max(0, i0 - loss90);
    }, [hasError, i0, particleN, lambdaNm]);

    const efficiency = i0 > 1e-9 ? (isValue / i0) * 100 : 0;

    const lambdaAxis = React.useMemo(() => Array.from({ length: 301 }, (_, i) => 400 + i), []);
    const scatterLambdaCurve = React.useMemo(() => {
        if (hasError) return lambdaAxis.map(() => 0);
        return lambdaAxis.map((lam) => scatteringIntensity(i0, particleN, lam, 90));
    }, [hasError, lambdaAxis, i0, particleN]);

    const thetaAxis = React.useMemo(() => Array.from({ length: 361 }, (_, i) => i * 0.5), []);
    const scatterThetaCurve = React.useMemo(() => {
        if (hasError) return thetaAxis.map(() => 0);
        return thetaAxis.map((th) => scatteringIntensity(i0, particleN, lambdaNm, th));
    }, [hasError, thetaAxis, i0, particleN, lambdaNm]);

    const coloredLambdaSegments = React.useMemo<Data[]>(() => {
        const segments: Data[] = [];
        for (let start = 0; start < lambdaAxis.length - 1; start += COLOR_SEGMENT_SIZE) {
            const end = Math.min(start + COLOR_SEGMENT_SIZE, lambdaAxis.length - 1);
            const segX = lambdaAxis.slice(start, end + 1);
            const segY = scatterLambdaCurve.slice(start, end + 1);
            const midLambda = segX[Math.floor(segX.length / 2)];

            segments.push({
                type: 'scatter',
                mode: 'lines',
                x: segX,
                y: segY,
                line: { color: wavelengthToColor(midLambda), width: 3 },
                xaxis: 'x',
                yaxis: 'y',
                hoverinfo: 'skip',
                showlegend: start === 0,
                name: 'I_s(λ,90°)',
            });
        }
        return segments;
    }, [lambdaAxis, scatterLambdaCurve]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'particleN',
            label: <span>颗粒浓度 <MathKatexInline math="N" fallback="N" /> (m⁻³)</span>,
            type: 'slider',
            value: particleN,
            min: 1e15,
            max: 1e17,
            step: 1e15,
            onChange: setParticleN,
            valueLabelDisplay: 'auto',
            marks: [{ value: 1e15, label: '1e15' }, { value: 5e16, label: '5e16' }, { value: 1e17, label: '1e17' }],
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
            valueLabelDisplay: 'auto',
            marks: [{ value: 400, label: '400' }, { value: 550, label: '550' }, { value: 700, label: '700' }],
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
            valueLabelDisplay: 'auto',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }],
        },
        {
            key: 'thetaDeg',
            label: <span>观测角 <MathKatexInline math="\\theta" fallback="θ" /> (°)</span>,
            type: 'slider',
            value: thetaDeg,
            min: 0,
            max: 180,
            step: 1,
            onChange: setThetaDeg,
            valueLabelDisplay: 'auto',
            marks: [{ value: 0, label: '0' }, { value: 90, label: '90' }, { value: 180, label: '180' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>散射光强 <MathKatexInline math="I_s" fallback="Is" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={isValue.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>透射光强 <MathKatexInline math="I_t" fallback="It" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={iTrans.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="散射效率 (%)" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={efficiency.toFixed(3)} />
            </Stack>
            {hasError && <Alert severity="error">颗粒浓度/波长必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        ...coloredLambdaSegments,
        {
            type: 'scatter',
            mode: 'lines',
            x: thetaAxis,
            y: scatterThetaCurve,
            line: { color: '#a855f7', width: 3 },
            xaxis: 'x2',
            yaxis: 'y2',
            name: 'I_s(θ)',
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
                xaxis: { domain: [0, 0.46], title: { text: '波长 λ (nm)' }, range: [400, 700], fixedrange: true },
                yaxis: { title: { text: '散射光强 I_s' }, range: [0, 2.5], fixedrange: true },
                xaxis2: { domain: [0.55, 1], title: { text: '观测角 θ (°)' }, range: [0, 180], fixedrange: true },
                yaxis2: { title: { text: '散射光强 I_s' }, range: [0, 2.5], fixedrange: true },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        text: `I_s∝N/λ^4·(1+cos²θ), λ=${lambdaNm.toFixed(0)}nm`,
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
                    label: <span>蓝光</span>,
                    onClick: () => { setParticleN(3e16); setLambdaNm(400); setI0(1); setThetaDeg(90); },
                },
                {
                    label: <span>绿光</span>,
                    onClick: () => { setParticleN(3e16); setLambdaNm(550); setI0(1); setThetaDeg(90); },
                },
                {
                    label: <span>红光</span>,
                    onClick: () => { setParticleN(3e16); setLambdaNm(700); setI0(1); setThetaDeg(90); },
                },
            ]}
            hint={{
                title: '瑞利散射',
                content: (
                    <span>
                        天空的蓝色、日出日落的红色，核心都与瑞利散射有关。调节入射光波长
                        <MathKatexInline math="\\lambda" fallback="λ" />，可直观看到散射强度变化：
                        波长越短（蓝光）散射越强，波长越长（红光）散射越弱，从原理上解释日常最常见的天空色彩现象。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'rayleigh-lambda-trend',
                    type: 'single',
                    prompt: <span>光的波长越短，瑞利散射强度会如何变化？</span>,
                    options: ['散射强度越小', '散射强度不变', '散射强度越大', '先减小后增大'],
                    correctOptionIndex: 2,
                    successTip: <span>正确：<MathKatexInline math="I_s\\propto1/\\lambda^4" fallback="Is∝1/λ^4" />，波长越短，散射越强。</span>,
                    failTip: <span>提示：瑞利散射强度与波长四次方成反比。</span>,
                },
                {
                    id: 'rayleigh-sky-blue-reason',
                    type: 'single',
                    prompt: <span>为什么晴朗天空通常呈蓝色？</span>,
                    options: [
                        '因为蓝光能量最低，不易被吸收',
                        '因为蓝光波长较短，被大气分子更强烈散射',
                        '因为红光在白天不会传播',
                        '因为太阳只发出蓝光',
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：蓝光波长更短，瑞利散射更强，因此更容易布满天空。</span>,
                    failTip: <span>提示：可从不同波长光的散射强弱差异来判断天空颜色。</span>,
                },
            ]}
            summaryItems={[
                '散射粒子尺寸远小于光波长时，对应瑞利散射条件。',
                <span key="s2">散射强度满足 <MathKatexInline math="I_s\\propto1/\\lambda^4" fallback="Is∝1/λ^4" />。</span>,
                '短波（蓝紫）散射远强于长波（红光）。',
                '天空蓝、落日红是瑞利散射导致的典型自然现象。',
                '瑞利散射也是光纤本征损耗的主要来源之一。',
            ]}
            applicationItems={[
                '晴朗天空呈蓝色主要源于短波光在大气分子中的强瑞利散射。',
                '日出和日落时光程更长，短波被大量散射后剩余长波使天空更偏红色。',
                '雾霾天气中颗粒增多会改变散射分布，导致视场发白并降低成像对比度。',
            ]}
        />
    );
}
