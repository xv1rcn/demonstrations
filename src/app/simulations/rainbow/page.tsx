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

type Vec = { x: number; y: number };

type RayTrace = {
    valid: boolean;
    p1: Vec;
    p2: Vec;
    p3: Vec;
    dIn: Vec;
    dOut: Vec;
    outAngle: number;
    elevation: number;
};

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;

const norm = (v: Vec): Vec => {
    const len = Math.hypot(v.x, v.y);
    if (len < 1e-9) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toDegree = (rad: number) => rad * 180 / Math.PI;

const wavelengthToRgb = (lambda: number) => {
    const wl = clamp(lambda, 380, 780);
    let r = 0;
    let g = 0;
    let b = 0;

    if (wl < 440) {
        r = -(wl - 440) / 60;
        b = 1;
    } else if (wl < 490) {
        g = (wl - 440) / 50;
        b = 1;
    } else if (wl < 510) {
        g = 1;
        b = -(wl - 510) / 20;
    } else if (wl < 580) {
        r = (wl - 510) / 70;
        g = 1;
    } else if (wl < 645) {
        r = 1;
        g = -(wl - 645) / 65;
    } else {
        r = 1;
    }

    let factor = 1;
    if (wl < 420) {
        factor = 0.3 + 0.7 * (wl - 380) / 40;
    } else if (wl > 700) {
        factor = 0.3 + 0.7 * (780 - wl) / 80;
    }

    const gamma = 0.8;
    const conv = (v: number) => Math.round(255 * Math.pow(Math.max(0, v * factor), gamma));
    return { r: conv(r), g: conv(g), b: conv(b) };
};

const wavelengthToColor = (lambda: number, alpha = 1) => {
    const { r, g, b } = wavelengthToRgb(lambda);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const refractiveIndex = (base: number, lambda: number) => {
    const k = 0.0024;
    const offset = k * ((1_000_000 / (lambda * lambda)) - (1_000_000 / (550 * 550)));
    return clamp(base + offset, 1.31, 1.36);
};

const refract = (incident: Vec, normal: Vec, nFrom: number, nTo: number): Vec | null => {
    const i = norm(incident);
    let n = norm(normal);
    let cosI = clamp(dot(i, n), -1, 1);
    let etaI = nFrom;
    let etaT = nTo;

    if (cosI > 0) {
        n = scale(n, -1);
        [etaI, etaT] = [etaT, etaI];
    } else {
        cosI = -cosI;
    }

    const eta = etaI / etaT;
    const k = 1 - eta * eta * (1 - cosI * cosI);
    if (k < 0) return null;
    return norm(add(scale(i, eta), scale(n, eta * cosI - Math.sqrt(k))));
};

const reflect = (incident: Vec, normal: Vec): Vec => {
    const i = norm(incident);
    const n = norm(normal);
    return norm(sub(i, scale(n, 2 * dot(i, n))));
};

const intersectCircle = (p: Vec, d: Vec): Vec | null => {
    const dir = norm(d);
    const b = 2 * dot(p, dir);
    const c = dot(p, p) - 1;
    const delta = b * b - 4 * c;
    if (delta < 0) return null;
    const s = Math.sqrt(delta);
    const t1 = (-b - s) / 2;
    const t2 = (-b + s) / 2;
    const t = [t1, t2].filter((v) => v > 1e-6).sort((a, b2) => a - b2)[0];
    if (!t) return null;
    return add(p, scale(dir, t));
};

const traceRainbowRay = (nWater: number, incidenceDeg: number): RayTrace => {
    const iRad = incidenceDeg * Math.PI / 180;
    const p1: Vec = { x: -Math.cos(iRad), y: Math.sin(iRad) };
    const dIn: Vec = { x: 1, y: 0 };

    const n1 = norm(p1);
    const dInside1 = refract(dIn, n1, 1, nWater);
    if (!dInside1) {
        return { valid: false, p1, p2: p1, p3: p1, dIn, dOut: dIn, outAngle: 0, elevation: 0 };
    }

    const p2 = intersectCircle(p1, dInside1);
    if (!p2) {
        return { valid: false, p1, p2: p1, p3: p1, dIn, dOut: dIn, outAngle: 0, elevation: 0 };
    }

    const n2 = norm(p2);
    const dInside2 = reflect(dInside1, n2);

    const p3 = intersectCircle(p2, dInside2);
    if (!p3) {
        return { valid: false, p1, p2, p3: p2, dIn, dOut: dInside2, outAngle: 0, elevation: 0 };
    }

    const n3 = norm(p3);
    const dOut = refract(dInside2, n3, nWater, 1);
    if (!dOut) {
        return { valid: false, p1, p2, p3, dIn, dOut: dInside2, outAngle: 0, elevation: 0 };
    }

    const outAngle = toDegree(Math.atan2(dOut.y, dOut.x));
    const elevation = toDegree(Math.acos(clamp(-dot(norm(dIn), norm(dOut)), -1, 1)));

    return { valid: true, p1, p2, p3, dIn, dOut, outAngle, elevation };
};

export default function Page() {
    const [nWater, setNWater] = React.useState<number>(1.33);
    const [incidence, setIncidence] = React.useState<number>(42);

    const redRay = React.useMemo(() => traceRainbowRay(refractiveIndex(nWater, 700), incidence), [nWater, incidence]);
    const violetRay = React.useMemo(() => traceRainbowRay(refractiveIndex(nWater, 420), incidence), [nWater, incidence]);
    const greenRay = React.useMemo(() => traceRainbowRay(refractiveIndex(nWater, 550), incidence), [nWater, incidence]);

    const spectrumWavelengths = React.useMemo(() => Array.from({ length: 31 }, (_, i) => 700 - i * 10), []);

    const spectrumRays = React.useMemo(
        () => spectrumWavelengths
            .map((wl) => {
                const ray = traceRainbowRay(refractiveIndex(nWater, wl), incidence);
                if (!ray.valid) return null;
                const end = add(ray.p3, scale(ray.dOut, 1.8));
                return {
                    wl,
                    x: [ray.p3.x, end.x],
                    y: [ray.p3.y, end.y],
                    color: wavelengthToColor(wl, 0.9),
                };
            })
            .filter((v): v is { wl: number; x: number[]; y: number[]; color: string } => v !== null),
        [spectrumWavelengths, nWater, incidence],
    );

    const circleX = React.useMemo(() => Array.from({ length: 361 }, (_, i) => Math.cos(i * Math.PI / 180)), []);
    const circleY = React.useMemo(() => Array.from({ length: 361 }, (_, i) => Math.sin(i * Math.PI / 180)), []);

    const redElevationText = redRay.valid ? `${redRay.elevation.toFixed(2)}°` : '--';
    const violetElevationText = violetRay.valid ? `${violetRay.elevation.toFixed(2)}°` : '--';
    const rainbowSpanText = redRay.valid && violetRay.valid
        ? `${Math.min(redRay.elevation, violetRay.elevation).toFixed(2)}° ~ ${Math.max(redRay.elevation, violetRay.elevation).toFixed(2)}°`
        : '--';

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: circleX,
            y: circleY,
            line: { color: '#0f172a', width: 2 },
            name: '水滴边界',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: greenRay.valid ? [greenRay.p1.x - 1.4, greenRay.p1.x] : [-2.4, -1],
            y: greenRay.valid ? [greenRay.p1.y, greenRay.p1.y] : [0, 0],
            line: { color: '#e5e7eb', width: 4 },
            name: '入射光',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: greenRay.valid ? [greenRay.p1.x, greenRay.p2.x] : [0, 0],
            y: greenRay.valid ? [greenRay.p1.y, greenRay.p2.y] : [0, 0],
            line: { color: '#60a5fa', width: 4 },
            name: '第一次折射',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: greenRay.valid ? [greenRay.p2.x, greenRay.p3.x] : [0, 0],
            y: greenRay.valid ? [greenRay.p2.y, greenRay.p3.y] : [0, 0],
            line: { color: '#22c55e', width: 4 },
            name: '内部反射',
        },
        ...spectrumRays.map((s) => ({
            type: 'scatter' as const,
            mode: 'lines' as const,
            x: s.x,
            y: s.y,
            line: { color: s.color, width: 3 },
            showlegend: false,
            hovertemplate: `λ=${s.wl}nm<extra></extra>`,
        })),
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'nWater',
            label: <span>水折射率 <MathKatexInline math="n" fallback="n" /></span>,
            type: 'slider',
            value: nWater,
            min: 1.30,
            max: 1.36,
            step: 0.001,
            onChange: setNWater,
            tipIncrease: '调大水的折射率，不同颜色光的出射角差异会变大，彩虹的色彩间距会更宽，色彩更清晰。',
            tipDecrease: '调小水的折射率，出射角差异会变小，彩虹的色彩更密集、暗淡。',
            marks: [{ value: 1.30, label: '1.30' }, { value: 1.33, label: '1.33' }, { value: 1.36, label: '1.36' }],
        },
        {
            key: 'incidence',
            label: <span>入射角 <MathKatexInline math="\\theta_i" fallback="θi" /> (°)</span>,
            type: 'slider',
            value: incidence,
            min: 20,
            max: 75,
            step: 0.1,
            onChange: setIncidence,
            tipIncrease: '调大光线的入射角，彩虹的整体出射角度会变大，色彩会变得模糊甚至消失，出现漫射效果。',
            tipDecrease: '调小光线的入射角，彩虹的出射角度更标准，色彩更清晰、鲜艳。',
            marks: [{ value: 20, label: '20' }, { value: 42, label: '42' }, { value: 70, label: '70' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>红光仰角 <MathKatexInline math="\\theta_{red}" fallback="θred" /> </span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={redElevationText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>紫光仰角 <MathKatexInline math="\\theta_{violet}" fallback="θviolet" /> </span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={violetElevationText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="彩虹仰角范围" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={rainbowSpanText} />
            </Stack>
        </>
    );

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 20, l: 20, r: 20, b: 20 },
                xaxis: { range: [-2.3, 2.8], visible: false, fixedrange: true },
                yaxis: { range: [-1.9, 1.9], visible: false, scaleanchor: 'x', scaleratio: 1, fixedrange: true },
                annotations: [
                    {
                        x: -1.9,
                        y: 1.6,
                        text: `n=${nWater.toFixed(3)}, θi=${incidence.toFixed(1)}°`,
                        showarrow: false,
                    },
                    {
                        x: 1.95,
                        y: 1.6,
                        text: `红≈${redRay.valid ? redRay.elevation.toFixed(1) : '--'}°, 紫≈${violetRay.valid ? violetRay.elevation.toFixed(1) : '--'}°`,
                        showarrow: false,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: '两次折射 + 一次反射 → 彩虹主虹',
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
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
                    label: '🔴红光彩虹型',
                    tip: '对应雨后彩虹的外圈红光效果，红光的折射率适中，出射角达到彩虹的典型角度，红光在彩虹外圈清晰呈现，是彩虹色彩分布的主要特征之一。',
                    onClick: () => {
                        setNWater(1.33);
                        setIncidence(42);
                    },
                },
                {
                    label: '🟣紫光彩虹型',
                    tip: '对应雨后彩虹的内圈紫光效果，紫光的折射率更大，出射角更小，紫光在彩虹内圈呈现，与红光形成鲜明的内外圈色彩对比，是彩虹的核心色彩特征。',
                    onClick: () => {
                        setNWater(1.34);
                        setIncidence(42);
                    },
                },
                {
                    label: '🌤️漫射彩虹型',
                    tip: '对应阳光大角度入射时的淡彩虹效果，光线入射角度过大，彩虹的色彩偏折规律被打破，色彩变得暗淡且模糊，类似阴天或喷雾形成的淡彩虹，不易分辨清晰的色彩层次。',
                    onClick: () => {
                        setNWater(1.33);
                        setIncidence(70);
                    },
                },
            ]}
            hint={{
                title: '彩虹水滴折射',
                content: (
                    <span>
                        同学们好，欢迎来到彩虹水滴折射实验。<br />
                        雨后天空的彩虹、喷雾形成的人工彩虹，是光在小水珠中折射反射的结果。调节光的波长（红光/紫光）、入射角度
                        <MathKatexInline math="\theta_i" fallback="θi" />，能看到红光出射角约
                        <MathKatexInline math="42^\circ" fallback="42°" /> 在外圈、紫光约
                        <MathKatexInline math="40.5^\circ" fallback="40.5°" /> 在内圈，理解彩虹圆形轮廓和色彩分布的形成原因。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'rainbow-red-violet-order',
                    type: 'single',
                    prompt: (
                        <span>
                            彩虹中红光和紫光哪个在外侧？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">紫光在外侧，因为波长更短</span>,
                        <span key="q1-o2">红光在外侧，因为偏折最小、出射角最大</span>,
                        <span key="q1-o3">红光与紫光始终重合</span>,
                        <span key="q1-o4">颜色顺序完全随机</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：红光偏折最小，因此在主虹中位于外侧；紫光偏折更大，出现在内侧。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：红光和紫光的偏折角度不同，偏折小的色光会在彩虹的外侧。
                        </span>
                    ),
                },
                {
                    id: 'rainbow-red-elevation',
                    type: 'single',
                    prompt: (
                        <span>
                            人眼观察红光主虹的典型仰角大约是多少？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">约 <MathKatexInline math="20^\\circ" fallback="20°" /></span>,
                        <span key="q2-o2">约 <MathKatexInline math="42^\\circ" fallback="42°" /></span>,
                        <span key="q2-o3">约 <MathKatexInline math="60^\\circ" fallback="60°" /></span>,
                        <span key="q2-o4">约 <MathKatexInline math="90^\\circ" fallback="90°" /></span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：主虹中红光典型仰角约为 <MathKatexInline math="42^\\circ" fallback="42°" />，紫光约为 <MathKatexInline math="40.5^\\circ" fallback="40.5°" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：人眼观察红光彩虹的仰角是固定数值，可结合实验预设参数回忆。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '彩虹主虹由阳光在水滴中经历两次折射和一次内部反射后形成。',
                <span key="s2">红光典型出射仰角约 <MathKatexInline math="42^\\circ" fallback="42°" />，对应主虹外圈。</span>,
                <span key="s3">紫光典型出射仰角约 <MathKatexInline math="40.5^\\circ" fallback="40.5°" />，对应主虹内圈。</span>,
                '完整彩虹本质上是圆形；地面观察通常被地平线遮挡，因此常见为半圆弧。',
            ]}
            applicationItems={[
                '雨后彩虹：空气中均匀水滴群提供大量微小棱镜，满足主虹出射角条件时形成彩色圆弧。',
                '喷雾彩虹：喷泉或喷雾产生高密度细水滴，在逆光方向可快速形成局部彩虹。',
                '露珠彩虹：草叶露珠在低角度阳光下也可产生微型色散弧纹，属于同一光路机制。',
            ]}
        />
    );
}
