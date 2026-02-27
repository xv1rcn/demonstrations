'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import { wavelengthToRgb } from "@/lib/utils";
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'),
    { ssr: false, loading: () => (<Skeleton width={860} height={500} />) },
);

const FIXED_Y_RANGE_UM: [number, number] = [-50000, 50000];
const Y_SAMPLE_POINTS = 3001;

export default function Page() {
    const [dMm, setDMm] = React.useState<number>(0.5);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [distanceM, setDistanceM] = React.useState<number>(2);

    const deltaUm = React.useMemo(
        () => (lambdaNm * distanceM) / dMm,
        [lambdaNm, distanceM, dMm],
    );

    const yAxisUm = React.useMemo(() => {
        const [yMin, yMax] = FIXED_Y_RANGE_UM;
        return Array.from(
            { length: Y_SAMPLE_POINTS },
            (_, idx) => yMin + ((yMax - yMin) * idx) / (Y_SAMPLE_POINTS - 1),
        );
    }, []);

    const intensityLine = React.useMemo(
        () => yAxisUm.map((yUm) => Math.pow(Math.cos(Math.PI * dMm * yUm / (lambdaNm * distanceM)), 2)),
        [yAxisUm, dMm, lambdaNm, distanceM],
    );

    const screenX = React.useMemo(() => Array.from({ length: 26 }, (_, idx) => idx / 25), []);
    const heatmapZ = React.useMemo(
        () => intensityLine.map((value) => Array(screenX.length).fill(value)),
        [intensityLine, screenX.length],
    );

    const lineColor = wavelengthToRgb(lambdaNm);

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: intensityLine,
            y: yAxisUm,
            line: { color: lineColor, width: 3 },
            name: '干涉强度分布',
            xaxis: 'x',
            yaxis: 'y',
        },
        {
            type: 'heatmap',
            zmin: 0,
            zmax: 1,
            x: screenX,
            y: yAxisUm,
            z: heatmapZ,
            colorscale: [[0, 'rgb(8,8,8)'], [1, lineColor]],
            showscale: false,
            xaxis: 'x2',
            yaxis: 'y2',
            name: '屏上条纹',
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'dMm',
            label: <span>双缝间距 <MathKatexInline math="d" fallback="d" /> (mm)</span>,
            type: 'slider',
            value: dMm,
            min: 0.1,
            max: 2,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setDMm,
            marks: [{ value: 0.1, label: '0.1' }, { value: 2, label: '2.0' }],
        },
        {
            key: 'lambdaNm',
            label: <span>波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
            type: 'slider',
            value: lambdaNm,
            min: 400,
            max: 700,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setLambdaNm,
            marks: [{ value: 400, label: '400' }, { value: 700, label: '700' }],
        },
        {
            key: 'distanceM',
            label: <span>缝屏距离 <MathKatexInline math="D" fallback="D" /> (m)</span>,
            type: 'slider',
            value: distanceM,
            min: 1,
            max: 5,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setDistanceM,
            marks: [{ value: 1, label: '1' }, { value: 5, label: '5' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={2} direction="row">
            <Chip
                label={<span>条纹间距 <MathKatexInline math="\Delta x" fallback="Δx" /> (μm)</span>}
                variant="outlined"
                className="w-56"
            />
            <TextField disabled hiddenLabel size="small" variant="standard" value={deltaUm.toFixed(3)} />
        </Stack>
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
                    domain: [0, 0.83],
                    title: { text: '归一化强度 I' },
                    range: [0, 1.02],
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: '屏上位置 y (μm)' },
                    range: FIXED_Y_RANGE_UM,
                    fixedrange: true,
                },
                xaxis2: {
                    domain: [0.88, 1],
                    visible: false,
                    fixedrange: true,
                },
                yaxis2: {
                    matches: 'y',
                    visible: false,
                    fixedrange: true,
                },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `Δx=λD/d | d=${dMm.toFixed(2)}mm, λ=${lambdaNm.toFixed(0)}nm, D=${distanceM.toFixed(1)}m`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.94,
                        y: 1.03,
                        text: '屏上条纹',
                        showarrow: false,
                        font: { size: 12 },
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
                        setDMm(0.5);
                        setLambdaNm(550);
                        setDistanceM(2);
                    },
                },
                {
                    label: '条纹稀疏',
                    onClick: () => {
                        setDMm(0.1);
                        setLambdaNm(700);
                        setDistanceM(5);
                    },
                },
                {
                    label: '条纹密集',
                    onClick: () => {
                        setDMm(2.0);
                        setLambdaNm(400);
                        setDistanceM(1);
                    },
                },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'double-slit-d-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当双缝间距 <MathKatexInline math="d" fallback="d" /> 变大、
                            <MathKatexInline math="\lambda" fallback="λ" /> 与 <MathKatexInline math="D" fallback="D" /> 不变时，条纹间距
                            <MathKatexInline math="\Delta x" fallback="Δx" /> 会如何变化？
                        </span>
                    ),
                    options: ['条纹间距变大（条纹变疏）', '条纹间距变小（条纹变密）', '条纹间距不变', '仅亮度变化，条纹宽度不变'],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：由 <MathKatexInline math="\Delta x=\lambda D/d" fallback="Δx=λD/d" /> 可知，
                            <MathKatexInline math="d" fallback="d" /> 增大时 <MathKatexInline math="\Delta x" fallback="Δx" /> 变小。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：双缝间距与条纹间距变化规律相反；结合
                            <MathKatexInline math="\Delta x=\lambda D/d" fallback="Δx=λD/d" />
                            再回忆实验参数变化。
                        </span>
                    ),
                },
                {
                    id: 'double-slit-lambda-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当波长 <MathKatexInline math="\lambda" fallback="λ" /> 变长、
                            <MathKatexInline math="d" fallback="d" /> 与 <MathKatexInline math="D" fallback="D" /> 不变时，干涉条纹会如何变化？
                        </span>
                    ),
                    options: ['条纹间距变小（条纹变密）', '条纹间距变大（条纹变宽）', '条纹间距不变', '中央亮纹消失'],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：<MathKatexInline math="\lambda" fallback="λ" /> 增大时，
                            <MathKatexInline math="\Delta x" fallback="Δx" /> 随之增大，条纹变宽。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：波长越长，干涉作用越明显；结合
                            <MathKatexInline math="\Delta x=\lambda D/d" fallback="Δx=λD/d" />
                            判断条纹间距变化。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '两束相干光叠加后发生干涉，屏上形成稳定的明暗相间条纹。',
                <span key="s2">条纹间距公式：<MathKatexInline math="\Delta x=\lambda D/d" fallback="Δx=λD/d" />，用于定量描述条纹疏密。</span>,
                <span key="s3">在 <MathKatexInline math="d" fallback="d" />、<MathKatexInline math="D" fallback="D" /> 固定时，<MathKatexInline math="\lambda" fallback="λ" /> 越长，<MathKatexInline math="\Delta x" fallback="Δx" /> 越大，条纹越宽。</span>,
                <span key="s4">在 <MathKatexInline math="\lambda" fallback="λ" />、<MathKatexInline math="D" fallback="D" /> 固定时，双缝间距 <MathKatexInline math="d" fallback="d" /> 越大，条纹越密。</span>,
                <span key="s5">光程差满足 <MathKatexInline math="\delta = k\lambda" fallback="δ=kλ" /> 为明纹，满足 <MathKatexInline math="\delta=(k+\tfrac12)\lambda" fallback="δ=(k+1/2)λ" /> 为暗纹。</span>,
            ]}
            applicationItems={[
                '肥皂泡彩色纹路源于薄膜上下表面反射光干涉，不同厚度位置对应不同增强波长。',
                '水面油膜出现彩色条纹同样来自薄膜干涉，膜厚变化导致不同颜色空间分布。',
                '相机镜头镀膜利用多层薄膜干涉抑制特定反射波段，提高透光率并减少眩光。',
            ]}
        />
    );
}
