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
    loading: () => (<Skeleton width={420} height={420} />),
});

export default function Page() {
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [radiusM, setRadiusM] = React.useState<number>(8);

    const x = React.useMemo(() => Array.from({ length: 241 }, (_, i) => i - 120), []);
    const y = React.useMemo(() => Array.from({ length: 241 }, (_, i) => i - 120), []);

    const lineProfile = React.useMemo(() => {
        return y.map((val) => Math.pow(Math.sin(Math.PI * (val * val) / (radiusM * lambdaNm)), 2));
    }, [y, radiusM, lambdaNm]);

    const heatmap = React.useMemo(() => {
        return x.map((xi) => y.map((yi) => {
            const rho = Math.sqrt(xi * xi + yi * yi);
            return Math.pow(Math.sin(Math.PI * (rho * rho) / (radiusM * lambdaNm)), 2);
        }));
    }, [x, y, radiusM, lambdaNm]);

    const firstDarkRadius = React.useMemo(() => {
        return Math.sqrt(radiusM * lambdaNm);
    }, [radiusM, lambdaNm]);

    const ringDensityText = React.useMemo(() => {
        const density = 1 / Math.sqrt(radiusM * lambdaNm);
        return density.toFixed(5);
    }, [radiusM, lambdaNm]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'lambdaNm',
            label: <span>波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
            type: 'slider',
            value: lambdaNm,
            min: 380,
            max: 780,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setLambdaNm,
            marks: [{ value: 380, label: '380' }, { value: 550, label: '550' }, { value: 780, label: '780' }],
        },
        {
            key: 'radiusM',
            label: <span>曲率半径 <MathKatexInline math="R" fallback="R" /> (m)</span>,
            type: 'slider',
            value: radiusM,
            min: 4,
            max: 12,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setRadiusM,
            marks: [{ value: 4, label: '4' }, { value: 8, label: '8' }, { value: 12, label: '12' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>首暗环半径（示意）<MathKatexInline math="r_1" fallback="r₁" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={firstDarkRadius.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="环纹密度指标" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={ringDensityText} />
            </Stack>
        </>
    );

    const visualization = (
        <div className="flex h-full items-center justify-center space-x-4 mx-2">
            <Plot
                config={{ staticPlot: true }}
                data={[{ type: 'scatter', mode: 'lines', x: lineProfile, y } as Data]}
                layout={{
                    width: 420,
                    height: 420,
                    margin: { t: 20, l: 56, r: 16, b: 40 },
                    xaxis: { title: { text: '相对强度 I' }, range: [0, 1], fixedrange: true },
                    yaxis: { title: { text: '径向坐标 ρ (a.u.)' }, fixedrange: true },
                    annotations: [{
                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.98,
                        text: `I(ρ)=sin²(πρ²/(Rλ))`, showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)', bordercolor: '#cbd5e1', borderwidth: 1,
                    }],
                }}
            />
            <Plot
                config={{ staticPlot: true }}
                data={[{
                    type: 'heatmap', zmin: 0, zmax: 1, x, y, z: heatmap,
                    colorscale: [[0, 'white'], [1, 'black']], showscale: false,
                } as Data]}
                layout={{
                    width: 420,
                    height: 420,
                    margin: { t: 20, l: 20, r: 20, b: 20 },
                    xaxis: { visible: false, fixedrange: true },
                    yaxis: { visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1 },
                }}
            />
        </div>
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                { label: '标准', onClick: () => { setLambdaNm(550); setRadiusM(8); } },
                { label: '短波', onClick: () => { setLambdaNm(420); setRadiusM(8); } },
                { label: '大曲率半径', onClick: () => { setLambdaNm(550); setRadiusM(12); } },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'newton-rings-lambda-effect',
                    type: 'single',
                    prompt: <span>当 <MathKatexInline math="R" fallback="R" /> 固定时，减小波长 <MathKatexInline math="\\lambda" fallback="λ" /> 会使环纹如何变化？</span>,
                    options: ['环纹间距变大、变稀疏', '环纹间距变小、变密集', '环纹消失', '只改变亮度不改变间距'],
                    correctOptionIndex: 1,
                    successTip: <span>正确：由 <MathKatexInline math="r_m\propto\\sqrt{R\\lambda}" fallback="rₘ∝√(Rλ)" /> 可知 λ 减小时环纹半径序列收缩，整体更密。</span>,
                    failTip: <span>提示：可结合 <MathKatexInline math="r_m\propto\\sqrt{R\\lambda}" fallback="rₘ∝√(Rλ)" /> 判断波长对环半径和环距的影响。</span>,
                },
                {
                    id: 'newton-rings-center-dark',
                    type: 'single',
                    prompt: <span>反射牛顿环实验中中心常见暗纹，主要原因是什么？</span>,
                    options: ['中心厚度最厚，强度最强', '两束反射光在中心发生相消干涉', '中心光程差恒为整数倍 λ', '只与透镜材料颜色有关'],
                    correctOptionIndex: 1,
                    successTip: <span>正确：中心膜厚近零但反射相位存在附加变化，导致中心附近满足相消条件形成暗纹。</span>,
                    failTip: <span>提示：中心暗纹来自干涉条件，不是“亮度随机”结果，关键看相位差与膜厚关系。</span>,
                },
            ]}
            summaryItems={[
                <span key="s1">牛顿环由薄空气膜反射干涉形成，环纹半径满足近似关系 <MathKatexInline math="r_m\propto\\sqrt{R\\lambda}" fallback="rₘ∝√(Rλ)" />。</span>,
                '波长越短或曲率半径越小，环纹越密集；反之环纹间距增大。',
                '中心纹亮暗与相位突变及膜厚接近零时的干涉条件有关。',
                '该实验常用于波长测量、平面度检验和微小厚度变化分析。',
            ]}
            applicationItems={[
                '光学元件检测：利用牛顿环判断透镜与平板接触质量及表面形貌误差。',
                '精密计量：通过环纹变化反推微米量级位移或膜厚变化。',
                '教学演示：直观展示薄膜干涉与相位差控制对条纹分布的影响。',
            ]}
        />
    );
}
