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

type Vec = { x: number; y: number };

type RayResult = {
    valid: boolean;
    pEntry: Vec;
    pExit: Vec;
    dIn: Vec;
    dInside: Vec;
    dOut: Vec;
    delta: number;
};

type SpectrumHit = {
    wl: number;
    hit: Vec;
    ray: RayResult;
};

type SegmentHit = {
    point: Vec;
    t: number;
};

const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y });
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y });
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s });
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const cross2 = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
const norm = (a: Vec): Vec => {
    const l = Math.hypot(a.x, a.y);
    if (l < 1e-9) return { x: 0, y: 0 };
    return { x: a.x / l, y: a.y / l };
};

const refractiveIndex = (lambdaNm: number) => {
    const lambdaUm = lambdaNm / 1000;
    return 1.5046 + 0.0042 / (lambdaUm * lambdaUm);
};

const wavelengthToColor = (lambda: number) => {
    const wl = Math.max(380, Math.min(780, lambda));

    let r = 0;
    let g = 0;
    let b = 0;

    if (wl >= 380 && wl < 440) {
        r = -(wl - 440) / (440 - 380);
        b = 1;
    } else if (wl >= 440 && wl < 490) {
        g = (wl - 440) / (490 - 440);
        b = 1;
    } else if (wl >= 490 && wl < 510) {
        g = 1;
        b = -(wl - 510) / (510 - 490);
    } else if (wl >= 510 && wl < 580) {
        r = (wl - 510) / (580 - 510);
        g = 1;
    } else if (wl >= 580 && wl < 645) {
        r = 1;
        g = -(wl - 645) / (645 - 580);
    } else if (wl >= 645 && wl <= 780) {
        r = 1;
    }

    let factor = 0;
    if (wl >= 380 && wl < 420) {
        factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
    } else if (wl >= 420 && wl <= 700) {
        factor = 1;
    } else if (wl > 700 && wl <= 780) {
        factor = 0.3 + 0.7 * (780 - wl) / (780 - 700);
    }

    const gamma = 0.8;
    const to255 = (v: number) => Math.round(255 * Math.pow(Math.max(0, v * factor), gamma));

    return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
};

const raySegmentIntersection = (p: Vec, d: Vec, a: Vec, b: Vec): SegmentHit | null => {
    const e = sub(b, a);
    const den = cross2(d, e);
    if (Math.abs(den) < 1e-10) return null;
    const ap = sub(a, p);
    const t = cross2(ap, e) / den;
    const u = cross2(ap, d) / den;
    if (t <= 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
    return { point: add(p, scale(d, t)), t };
};

const orientNormalAgainstIncident = (incident: Vec, normal: Vec): Vec => {
    return dot(incident, normal) < 0 ? normal : scale(normal, -1);
};

const refract = (incident: Vec, normal: Vec, nFrom: number, nTo: number): Vec | null => {
    const i = norm(incident);
    const n = norm(normal);
    const eta = nFrom / nTo;
    const cosI = -dot(i, n);
    const k = 1 - eta * eta * (1 - cosI * cosI);
    if (k < 0) return null;
    return norm(add(scale(i, eta), scale(n, eta * cosI - Math.sqrt(k))));
};

const tracePrismRay = (
    incidenceDeg: number,
    lambdaNm: number,
    pEntry: Vec,
    leftFaceTop: Vec,
    leftFaceBottom: Vec,
    apexPoint: Vec,
): RayResult => {
    const nPrism = refractiveIndex(lambdaNm);

    const leftFace = sub(leftFaceBottom, leftFaceTop);
    const upperFace = sub(apexPoint, leftFaceTop);
    const lowerFace = sub(apexPoint, leftFaceBottom);

    const tangentLeft = norm(leftFace);
    const inwardLeftCandidate = norm({ x: -tangentLeft.y, y: tangentLeft.x });

    const dIn = norm(add(
        scale(inwardLeftCandidate, Math.cos(toRadian(incidenceDeg))),
        scale(tangentLeft, -Math.sin(toRadian(incidenceDeg))),
    ));

    const inwardLeft = orientNormalAgainstIncident(dIn, inwardLeftCandidate);
    const dInside = refract(dIn, inwardLeft, 1, nPrism);
    if (!dInside) {
        return { valid: false, pEntry, pExit: pEntry, dIn, dInside: dIn, dOut: dIn, delta: 0 };
    }

    const hitUpper = raySegmentIntersection(pEntry, dInside, leftFaceTop, apexPoint);
    const hitLower = raySegmentIntersection(pEntry, dInside, leftFaceBottom, apexPoint);

    const candidates = [hitUpper, hitLower].filter((item): item is SegmentHit => item !== null);
    if (candidates.length === 0) {
        return { valid: false, pEntry, pExit: pEntry, dIn, dInside, dOut: dInside, delta: 0 };
    }

    const exitHit = candidates.reduce((best, cur) => (cur.t < best.t ? cur : best));
    const pExit = exitHit.point;

    const exitFace = hitUpper && Math.abs(exitHit.t - hitUpper.t) < 1e-9 ? upperFace : lowerFace;

    const tangentRight = norm(exitFace);
    const outwardRightCandidate = norm({ x: -tangentRight.y, y: tangentRight.x });
    const outwardRight = orientNormalAgainstIncident(dInside, outwardRightCandidate);

    const dOut = refract(dInside, outwardRight, nPrism, 1) ?? dInside;

    const delta = Math.acos(Math.max(-1, Math.min(1, dot(norm(dIn), norm(dOut)))));

    return {
        valid: true,
        pEntry,
        pExit,
        dIn,
        dInside,
        dOut,
        delta: toDegree(delta),
    };
};

export default function Page() {
    const [apex, setApex] = React.useState<number>(60);
    const [lambda, setLambda] = React.useState<number>(550);
    const [incidence, setIncidence] = React.useState<number>(30);

    const prismHeight = 2.8;
    const halfH = prismHeight / 2;
    const entryX = 2.4;
    const tipX = 4.6 + (apex - 45) * 0.016;

    const leftFaceTop = React.useMemo<Vec>(() => ({ x: entryX, y: halfH }), [entryX, halfH]);
    const leftFaceBottom = React.useMemo<Vec>(() => ({ x: entryX, y: -halfH }), [entryX, halfH]);
    const apexPoint = React.useMemo<Vec>(() => ({ x: tipX, y: 0 }), [tipX]);
    const pEntry = React.useMemo<Vec>(() => ({ x: entryX, y: 0 }), [entryX]);

    const selected = React.useMemo(
        () => tracePrismRay(incidence, lambda, pEntry, leftFaceTop, leftFaceBottom, apexPoint),
        [incidence, lambda, pEntry, leftFaceTop, leftFaceBottom, apexPoint],
    );

    const continuousWavelengths = React.useMemo(() => Array.from({ length: 301 }, (_, i) => 400 + i), []);
    const detectorX = 6.1;

    const collectHit = React.useCallback((wl: number): SpectrumHit | null => {
        const ray = tracePrismRay(incidence, wl, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        if (!ray.valid || Math.abs(ray.dOut.x) < 1e-6) return null;
        const t = (detectorX - ray.pExit.x) / ray.dOut.x;
        if (t <= 0) return null;
        const hit = add(ray.pExit, scale(ray.dOut, t));
        return { wl, hit, ray };
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint]);

    const spectrumBand = React.useMemo(
        () => continuousWavelengths.map(collectHit).filter((v): v is SpectrumHit => v !== null),
        [continuousWavelengths, collectHit],
    );

    const selectedHit = React.useMemo(() => collectHit(lambda), [collectHit, lambda]);

    const delta = selected.valid ? selected.delta : null;
    const theta4 = delta === null ? null : delta + apex - incidence;

    const delta400 = React.useMemo(() => {
        const ray = tracePrismRay(incidence, 400, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        return ray.valid ? ray.delta : null;
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint]);

    const delta700 = React.useMemo(() => {
        const ray = tracePrismRay(incidence, 700, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        return ray.valid ? ray.delta : null;
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint]);

    const dispersion = delta400 !== null && delta700 !== null ? Math.abs(delta400 - delta700) : null;

    const prismX = [leftFaceTop.x, apexPoint.x, leftFaceBottom.x, leftFaceTop.x];
    const prismY = [leftFaceTop.y, apexPoint.y, leftFaceBottom.y, leftFaceTop.y];

    const spectrumTraces: Data[] = spectrumBand.map((s) => ({
        type: 'scatter',
        mode: 'lines',
        x: [detectorX, detectorX + 0.3],
        y: [s.hit.y, s.hit.y],
        line: { color: wavelengthToColor(s.wl), width: 3.5 },
        hovertemplate: `λ=${s.wl}nm<extra></extra>`,
        showlegend: false,
    }));

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: prismX,
            y: prismY,
            fill: 'toself',
            fillcolor: 'rgba(148,163,184,0.18)',
            line: { color: '#334155', width: 2 },
            name: '三棱镜',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [pEntry.x - 2.2 * selected.dIn.x, pEntry.x],
            y: [pEntry.y - 2.2 * selected.dIn.y, pEntry.y],
            line: { color: '#e5e7eb', width: 4 },
            name: '入射光',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [pEntry.x, selected.pExit.x],
            y: [pEntry.y, selected.pExit.y],
            line: { color: '#60a5fa', width: 4 },
            name: '棱镜内光路',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: selectedHit ? [selectedHit.ray.pExit.x, selectedHit.hit.x] : [selected.pExit.x],
            y: selectedHit ? [selectedHit.ray.pExit.y, selectedHit.hit.y] : [selected.pExit.y],
            line: { color: wavelengthToColor(lambda), width: 4 },
            name: '当前 λ 光线',
        },
        ...spectrumTraces,
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'apex',
            label: <span>顶角 <MathKatexInline math="A" fallback="A" /> (°)</span>,
            type: 'slider',
            value: apex,
            min: 30,
            max: 70,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setApex,
            marks: [{ value: 30, label: '30' }, { value: 60, label: '60' }, { value: 70, label: '70' }],
        },
        {
            key: 'lambda',
            label: <span>波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
            type: 'slider',
            value: lambda,
            min: 400,
            max: 700,
            step: 1,
            valueLabelDisplay: 'auto',
            onChange: setLambda,
            marks: [{ value: 400, label: '400' }, { value: 700, label: '700' }],
        },
        {
            key: 'incidence',
            label: <span>入射角 <MathKatexInline math="\\theta_1" fallback="θ₁" /> (°)</span>,
            type: 'slider',
            value: incidence,
            min: 0,
            max: 60,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setIncidence,
            marks: [{ value: 0, label: '0' }, { value: 30, label: '30' }, { value: 60, label: '60' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>偏转角 <MathKatexInline math="\\delta" fallback="δ" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={delta === null ? '--' : delta.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>出射角 <MathKatexInline math="\\theta_4" fallback="θ₄" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={theta4 === null ? '--' : theta4.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>色散量 <MathKatexInline math="\\Delta\\delta" fallback="Δδ" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={dispersion === null ? '--' : dispersion.toFixed(3)} />
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
                xaxis: { range: [-2.1, 7.3], visible: false, fixedrange: true },
                yaxis: { range: [-3.2, 3.2], visible: false, scaleanchor: 'x', scaleratio: 1, fixedrange: true },
                shapes: [
                    {
                        type: 'line',
                        x0: detectorX,
                        x1: detectorX,
                        y0: -3,
                        y1: 3,
                        line: { color: '#94a3b8', width: 1.5, dash: 'dot' },
                    },
                ],
                annotations: [
                    {
                        x: 0.2,
                        y: 2.8,
                        text: `A=${apex.toFixed(1)}°, θ1=${incidence.toFixed(1)}°, λ=${lambda.toFixed(0)}nm`,
                        showarrow: false,
                    },
                    {
                        x: detectorX + 0.2,
                        y: 2.8,
                        text: '色散屏',
                        showarrow: false,
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `δ=θ1+θ4-A | Δδ=${dispersion === null ? '--' : dispersion.toFixed(2)}°`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.82)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                ],
                showlegend: true,
                legend: { orientation: 'h', x: 0.03, y: 1.08 },
            }}
        />
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                {
                    label: '默认',
                    onClick: () => {
                        setApex(60);
                        setLambda(550);
                        setIncidence(30);
                    },
                },
                {
                    label: '强色散',
                    onClick: () => {
                        setApex(60);
                        setLambda(400);
                        setIncidence(30);
                    },
                },
                {
                    label: '弱色散',
                    onClick: () => {
                        setApex(30);
                        setLambda(700);
                        setIncidence(30);
                    },
                },
            ]}
            hint={{
                title: '三棱镜色散',
                content: (
                    <span>
                        同学们好，欢迎来到三棱镜色散实验。<br />
                        雨后的彩虹、钻石的多彩火彩，都是光的三棱镜色散效果。调节三棱镜顶角
                        <MathKatexInline math="A" fallback="A" />、入射光波长
                        <MathKatexInline math="\lambda" fallback="λ" />、入射角度
                        <MathKatexInline math="\theta_1" fallback="θ1" />，能看到光的偏折变化：波长越短（紫光）、顶角越大，偏折越明显，清晰看到白光分解为七色光的色散规律。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'prism-max-deviation-color',
                    type: 'single',
                    prompt: (
                        <span>
                            在七色光中，哪种色光在三棱镜中的偏折角通常最大？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">红光（波长最长）</span>,
                        <span key="q1-o2">黄光（中间波长）</span>,
                        <span key="q1-o3">紫光（波长最短，折射率最大）</span>,
                        <span key="q1-o4">各色光偏折角完全相同</span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: (
                        <span>
                            正确：在正常色散区，波长越短折射率越大，因此紫光偏折通常最明显。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：色光的偏折角度与波长成反比，波长越短，偏折越明显。
                        </span>
                    ),
                },
                {
                    id: 'prism-apex-dispersion-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当三棱镜顶角 <MathKatexInline math="A" fallback="A" /> 变大时，色散会如何变化？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">色散减弱，各色光更难分开</span>,
                        <span key="q2-o2">色散变得更明显，各色光分离更显著</span>,
                        <span key="q2-o3">只改变亮度，不影响色散角</span>,
                        <span key="q2-o4">顶角变化与色散无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：增大 <MathKatexInline math="A" fallback="A" /> 会增强不同波长的角度分离，色散条纹更易拉开。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：三棱镜顶角越大，对不同色光的分离作用越强，色散效果会更突出。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '白光经过三棱镜后分解为多种单色光，这一现象称为色散。',
                <span key="s2">在正常色散条件下，波长越短折射率越大，偏折角越大。</span>,
                <span key="s3">偏转角关系：<MathKatexInline math="\\delta=\\theta_1+\\theta_4-A" fallback="δ=θ₁+θ₄-A" />。</span>,
                <span key="s4">因此通常表现为紫光偏折最大、红光偏折最小，形成连续色带。</span>,
            ]}
            applicationItems={[
                '彩虹可视为大气中水滴对太阳白光产生折射与色散后的自然宏观呈现。',
                '分光镜与光谱仪利用色散把复合光拆分为不同波段，用于成分分析与波长测量。',
                '钻石火彩来源于高折射率晶体中的强色散与多次反射，使不同色光方向分离更明显。',
            ]}
        />
    );
}
