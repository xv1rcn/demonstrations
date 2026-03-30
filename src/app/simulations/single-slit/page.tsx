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

const FIXED_Y_RANGE_UM: [number, number] = [-20000, 20000];
const Y_SAMPLE_POINTS = 2401;
function sincSquared(alpha: number): number {
    if (Math.abs(alpha) < 1e-12) return 1;
    return Math.pow(Math.sin(alpha) / alpha, 2);
}

export default function Page() {
    const [aMm, setAMm] = React.useState<number>(0.1);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [fCm, setFCm] = React.useState<number>(30);

    const centralWidthUm = React.useMemo(
        () => 0.02 * lambdaNm * fCm / aMm,
        [lambdaNm, fCm, aMm],
    );

    const yAxisUm = React.useMemo(() => {
        const [yMin, yMax] = FIXED_Y_RANGE_UM;
        return Array.from(
            { length: Y_SAMPLE_POINTS },
            (_, idx) => yMin + ((yMax - yMin) * idx) / (Y_SAMPLE_POINTS - 1),
        );
    }, []);

    const intensityLine = React.useMemo(() => {
        return yAxisUm.map((yUm) => {
            const alpha = Math.PI * 100 * aMm * yUm / (lambdaNm * fCm);
            return sincSquared(alpha);
        });
    }, [yAxisUm, aMm, lambdaNm, fCm]);

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
            name: '衍射强度分布',
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
            key: 'aMm',
            label: <span>单缝宽度 <MathKatexInline math="a" fallback="a" /> (mm)</span>,
            type: 'slider',
            value: aMm,
            min: 0.02,
            max: 0.5,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: setAMm,
            marks: [{ value: 0.02, label: '0.02' }, { value: 0.5, label: '0.5' }],
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
            key: 'fCm',
            label: <span>焦距 <MathKatexInline math="f" fallback="f" /> (cm)</span>,
            type: 'slider',
            value: fCm,
            min: 10,
            max: 50,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setFCm,
            marks: [{ value: 10, label: '10' }, { value: 50, label: '50' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={2} direction="row">
            <Chip
                label={<span>中央明纹宽度 <MathKatexInline math="\Delta x" fallback="Δx" /> (μm)</span>}
                variant="outlined"
                className="w-56"
            />
            <TextField disabled hiddenLabel size="small" variant="standard" value={centralWidthUm.toFixed(2)} />
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
                        text: `Δx=2λf/a | a=${aMm.toFixed(2)}mm, λ=${lambdaNm.toFixed(0)}nm, f=${fCm.toFixed(0)}cm`,
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
                        setAMm(0.1);
                        setLambdaNm(550);
                        setFCm(30);
                    },
                },
                {
                    label: '强衍射',
                    onClick: () => {
                        setAMm(0.02);
                        setLambdaNm(700);
                        setFCm(50);
                    },
                },
                {
                    label: '弱衍射',
                    onClick: () => {
                        setAMm(0.5);
                        setLambdaNm(400);
                        setFCm(10);
                    },
                },
            ]}
            hint={{
                title: '单缝衍射',
                content: (
                    <span>
                        同学们好，欢迎来到单缝衍射实验。<br />
                        眯眼看向灯光时看到的射线、刀片边缘的光影模糊，都是单缝衍射的效果。调节缝宽
                        <MathKatexInline math="a" fallback="a" />、光的波长
                        <MathKatexInline math="\lambda" fallback="λ" />、透镜焦距
                        <MathKatexInline math="f" fallback="f" />，能清晰观察衍射强弱：缝越窄、波长越长、焦距越大，衍射现象越明显，中央明纹也会越宽越亮，还能看到暗纹出现的规律。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'single-slit-a-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当单缝宽度 <MathKatexInline math="a" fallback="a" /> 变小、
                            <MathKatexInline math="\\lambda" fallback="λ" /> 与 <MathKatexInline math="f" fallback="f" /> 不变时，中央明纹宽度
                            <MathKatexInline math="\\Delta x" fallback="Δx" /> 会如何变化？
                        </span>
                    ),
                    options: ['中央明纹宽度变小', '中央明纹宽度变大', '中央明纹宽度不变', '仅亮度变化，宽度不变'],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：由 <MathKatexInline math="\\Delta x=2\\lambda f/a" fallback="Δx=2λf/a" /> 可知，
                            <MathKatexInline math="a" fallback="a" /> 越小，中央明纹越宽。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：单缝越窄，光越容易扩散；结合
                            <MathKatexInline math="\\Delta x=2\\lambda f/a" fallback="Δx=2λf/a" />
                            判断宽度变化。
                        </span>
                    ),
                },
                {
                    id: 'single-slit-lambda-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当波长 <MathKatexInline math="\\lambda" fallback="λ" /> 变长、
                            <MathKatexInline math="a" fallback="a" /> 与 <MathKatexInline math="f" fallback="f" /> 不变时，衍射条纹整体会如何变化？
                        </span>
                    ),
                    options: ['整体变窄，衍射减弱', '整体变宽，衍射更显著', '条纹宽度不变', '中央明纹消失'],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：<MathKatexInline math="\\lambda" fallback="λ" /> 越长，
                            <MathKatexInline math="\\Delta x" fallback="Δx" /> 越大，衍射更明显。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：波长越长，衍射越突出；结合
                            <MathKatexInline math="\\Delta x=2\\lambda f/a" fallback="Δx=2λf/a" />
                            回忆条纹整体宽度变化。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '光通过窄缝后向四周扩散，偏离几何光路传播，这一现象称为衍射。',
                '中央明纹通常最亮最宽，包含主要能量，实验中常可观察到其占比超过 80%。',
                <span key="s3">中央明纹宽度公式：<MathKatexInline math="\\Delta x=2\\lambda f/a" fallback="Δx=2λf/a" />。</span>,
                <span key="s4">缝宽 <MathKatexInline math="a" fallback="a" /> 越小，衍射角越大，衍射效应越强。</span>,
                <span key="s5">暗纹条件可写为 <MathKatexInline math="a\\sin\\theta=k\\lambda" fallback="a·sinθ=kλ" />（<MathKatexInline math="k=1,2,3,\\dots" fallback="k=1,2,3,…" />）。</span>,
            ]}
            applicationItems={[
                '眯眼看灯光出现“光芒射线”，本质上是眼睫毛附近窄缝结构引起的衍射增强。',
                '刀片或细边缘附近会出现明暗扩展条纹，常用于演示边缘衍射与波动性。',
                '光栅光谱仪中的狭缝负责限宽与准直，狭缝衍射特性直接影响分辨率与谱线形状。',
            ]}
        />
    );
}
