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

const C_KM_S = 3e5;
const SIGMA_NM = 10;
const COLOR_SEGMENT_SIZE = 12;

function wavelengthToColor(lambdaNm: number): string {
    if (!Number.isFinite(lambdaNm)) return '#64748b';
    const clamped = Math.max(380, Math.min(700, lambdaNm));
    const hue = ((700 - clamped) / (700 - 380)) * 240;
    return `hsl(${hue}, 90%, 45%)`;
}

export default function Page() {
    const [speedKmS, setSpeedKmS] = React.useState<number>(0);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [direction, setDirection] = React.useState<number>(1);

    const hasError = lambdaNm <= 0 || speedKmS < 0;

    const observedLambdaNm = React.useMemo(() => {
        if (hasError) return 0;
        const beta = speedKmS / C_KM_S;
        if (direction > 0) {
            return lambdaNm * Math.sqrt((1 + beta) / (1 - beta));
        }
        return lambdaNm * Math.sqrt((1 - beta) / (1 + beta));
    }, [hasError, lambdaNm, speedKmS, direction]);

    const deltaLambdaNm = observedLambdaNm - lambdaNm;
    const shiftType = deltaLambdaNm > 0.01 ? '红移' : deltaLambdaNm < -0.01 ? '蓝移' : '近似无偏移';
    const shiftColor = deltaLambdaNm > 0.01 ? '#dc2626' : deltaLambdaNm < -0.01 ? '#2563eb' : '#64748b';
    const sourceLambdaColor = wavelengthToColor(lambdaNm);

    const xLambda = React.useMemo(() => Array.from({ length: 1201 }, (_, i) => 350 + i * 0.5), []);
    const spectrum = React.useMemo(() => {
        if (hasError) return xLambda.map(() => 0);
        return xLambda.map((x) => Math.exp(-Math.pow(x - observedLambdaNm, 2) / (2 * SIGMA_NM * SIGMA_NM)));
    }, [hasError, xLambda, observedLambdaNm]);

    const coloredLineSegments = React.useMemo<Data[]>(() => {
        const segments: Data[] = [];
        for (let start = 0; start < xLambda.length - 1; start += COLOR_SEGMENT_SIZE) {
            const end = Math.min(start + COLOR_SEGMENT_SIZE, xLambda.length - 1);
            const segX = xLambda.slice(start, end + 1);
            const segY = spectrum.slice(start, end + 1);
            const midLambda = segX[Math.floor(segX.length / 2)];

            segments.push({
                type: 'scatter',
                mode: 'lines',
                x: segX,
                y: segY,
                line: { color: wavelengthToColor(midLambda), width: 3 },
                hoverinfo: 'skip',
                showlegend: false,
            });
        }
        return segments;
    }, [xLambda, spectrum]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'speedKmS',
            label: <span>相对速度 <MathKatexInline math="v" fallback="v" /> (km/s)</span>,
            type: 'slider',
            value: speedKmS,
            min: 0,
            max: 3000,
            step: 10,
            onChange: setSpeedKmS,
            valueLabelDisplay: 'auto',
            marks: [{ value: 0, label: '0' }, { value: 1500, label: '1500' }, { value: 3000, label: '3000' }],
        },
        {
            key: 'lambdaNm',
            label: <span>原波长 <MathKatexInline math="\\lambda_0" fallback="λ₀" /> (nm)</span>,
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
            key: 'direction',
            label: '运动方向',
            type: 'slider',
            value: direction,
            min: -1,
            max: 1,
            step: 2,
            onChange: setDirection,
            valueLabelDisplay: 'auto',
            marks: [{ value: -1, label: '靠近' }, { value: 1, label: '远离' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>观测波长 <MathKatexInline math="\\lambda'" fallback="λ'" /> (nm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={observedLambdaNm.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>偏移量 <MathKatexInline math="\\Delta\\lambda" fallback="Δλ" /> (nm)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={deltaLambdaNm.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="偏移类型" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={shiftType} />
            </Stack>
            {hasError && <Alert severity="error">请确认参数：速度不能为负，波长必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        ...coloredLineSegments,
        {
            type: 'scatter',
            mode: 'lines',
            x: [lambdaNm, lambdaNm],
            y: [0, 1.05],
            line: { color: sourceLambdaColor, width: 2, dash: 'dash' },
            name: '原波长',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [observedLambdaNm, observedLambdaNm],
            y: [0, 1.05],
            line: { color: shiftColor, width: 2, dash: 'dot' },
            name: '偏移方向',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 32, l: 58, r: 24, b: 52 },
                xaxis: { title: { text: '波长 λ (nm)' }, range: [380, 720], fixedrange: true },
                yaxis: { title: { text: '归一化谱线强度 I(λ)' }, range: [0, 1.08], fixedrange: true },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        showarrow: false,
                        text: `λ'=${observedLambdaNm.toFixed(2)}nm, Δλ=${deltaLambdaNm.toFixed(2)}nm, ${shiftType}`,
                        font: { color: shiftColor },
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: shiftColor,
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
                { label: '静止光源', onClick: () => { setSpeedKmS(0); setLambdaNm(550); setDirection(1); } },
                { label: '光源靠近', onClick: () => { setSpeedKmS(1000); setLambdaNm(550); setDirection(-1); } },
                { label: '光源远离', onClick: () => { setSpeedKmS(1000); setLambdaNm(550); setDirection(1); } },
            ]}
            hint={{
                title: '光的多普勒效应',
                content: (
                    <span>
                        同学们好，欢迎来到光的多普勒效应实验。<br />
                        宇宙星系的红移现象、交通的激光雷达测速，都是光学多普勒效应的应用。调节光源运动速度
                        <MathKatexInline math="v" fallback="v" />、原波长
                        <MathKatexInline math="\\lambda_0" fallback="λ₀" />，能看到光的频率偏移：光源靠近出现蓝移（波长变短），远离出现红移（波长变长），感受光波与声波多普勒效应的区别。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'optical-doppler-near',
                    type: 'single',
                    prompt: <span>光源靠近观察者时，光谱会发生什么移动？</span>,
                    options: [
                        '光谱发生蓝移（波长变短，向短波方向偏移）',
                        '光谱发生红移（波长变长，向长波方向偏移）',
                        '光谱不发生偏移',
                        '光谱强度变小但位置不变',
                    ],
                    correctOptionIndex: 0,
                    successTip: <span>正确：光源靠近观察者时，光谱发生蓝移（波长变短，向短波方向偏移）。</span>,
                    failTip: <span>提示：光源靠近观察者时，光的波长会变短，光谱偏移方向与此对应。</span>,
                },
                {
                    id: 'optical-doppler-away',
                    type: 'single',
                    prompt: <span>光源远离观察者时，光谱会发生什么移动？</span>,
                    options: [
                        '光谱发生蓝移（波长变短，向短波方向偏移）',
                        '光谱发生红移（波长变长，向长波方向偏移）',
                        '光谱不发生偏移',
                        '光谱强度增加且位置不变',
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：光源远离观察者时，光谱发生红移（波长变长，向长波方向偏移）。</span>,
                    failTip: <span>提示：光源远离观察者时，光的波长会变长，光谱会向长波方向偏移。</span>,
                },
            ]}
            summaryItems={[
                <span key="s1">波动因波源与观测者相对运动产生频率偏移。</span>,
                <span key="s2">靠近：蓝移（<MathKatexInline math="\\lambda\\downarrow" fallback="λ↓" />，<MathKatexInline math="f\\uparrow" fallback="f↑" />）；远离：红移（<MathKatexInline math="\\lambda\\uparrow" fallback="λ↑" />，<MathKatexInline math="f\\downarrow" fallback="f↓" />）。</span>,
                <span key="s3">光学近似公式：<MathKatexInline math="\\lambda\\approx\\lambda_0(1\\pm v/c)" fallback="λ≈λ₀(1±v/c)" />。</span>,
                '天文学用红移测量星系退行速度。',
                '与声波多普勒不同，光波只与相对速度有关。',
            ]}
            applicationItems={[
                '天文学中可通过宇宙星系红移测量星系退行速度，并进一步分析宇宙膨胀趋势。',
                '交通场景中的激光雷达测速利用多普勒频移反推出车辆速度，实现快速且非接触的测速。',
                '运动目标光电检测可借助光谱偏移信息判断目标的运动状态与相对速度变化。',
            ]}
        />
    );
}
