'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'),
    { ssr: false, loading: () => (<Skeleton width={500} height={400} />) },
);

type Reflectance = {
    Rs: number;
    Rp: number;
    tir: boolean;
};

const reflectanceAt = (thetaDeg: number, n1: number, n2: number): Reflectance => {
    const thetaI = thetaDeg * Math.PI / 180;
    const sinThetaT = (n1 / n2) * Math.sin(thetaI);
    if (Math.abs(sinThetaT) > 1) {
        return { Rs: 1, Rp: 1, tir: true };
    }

    const cosThetaI = Math.cos(thetaI);
    const cosThetaT = Math.sqrt(Math.max(0, 1 - sinThetaT * sinThetaT));

    const rs = (n1 * cosThetaI - n2 * cosThetaT) / (n1 * cosThetaI + n2 * cosThetaT);
    const rp = (n2 * cosThetaI - n1 * cosThetaT) / (n2 * cosThetaI + n1 * cosThetaT);

    return {
        Rs: Math.max(0, Math.min(1, rs * rs)),
        Rp: Math.max(0, Math.min(1, rp * rp)),
        tir: false,
    };
};

export default function Page() {
    const [theta, setTheta] = React.useState<number>(0);
    const [n1, setN1] = React.useState<number>(1);
    const [n2, setN2] = React.useState<number>(1.5);

    const x = React.useMemo(() => Array.from({ length: 901 }, (_, i) => i * 0.1), []);
    const yRs = React.useMemo(() => x.map((deg) => reflectanceAt(deg, n1, n2).Rs), [x, n1, n2]);
    const yRp = React.useMemo(() => x.map((deg) => reflectanceAt(deg, n1, n2).Rp), [x, n1, n2]);

    const brewsterDeg = React.useMemo(() => Math.atan2(n2, n1) * 180 / Math.PI, [n1, n2]);
    const current = React.useMemo(() => reflectanceAt(theta, n1, n2), [theta, n1, n2]);

    const crossing = React.useMemo(() => {
        let minIdx = 0;
        let minDiff = Number.POSITIVE_INFINITY;
        for (let i = 0; i < x.length; i += 1) {
            const diff = Math.abs(yRs[i] - yRp[i]);
            if (diff < minDiff) {
                minDiff = diff;
                minIdx = i;
            }
        }
        return { x: x[minIdx], y: (yRs[minIdx] + yRp[minIdx]) / 2 };
    }, [x, yRs, yRp]);

    const brewsterPoint = React.useMemo(() => {
        const y = reflectanceAt(brewsterDeg, n1, n2).Rp;
        return { x: brewsterDeg, y };
    }, [brewsterDeg, n1, n2]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'theta',
            label: <span>入射角 <MathKatexInline math="\\theta" fallback="θ" /> (°)</span>,
            type: 'slider',
            value: theta,
            min: 0,
            max: 90,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setTheta,
            marks: [{ value: 0, label: '0' }, { value: 90, label: '90' }],
        },
        {
            key: 'n1',
            label: <span>介质1折射率 <MathKatexInline math="n_1" fallback="n₁" /></span>,
            type: 'slider',
            value: n1,
            min: 1,
            max: 1.6,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: setN1,
            marks: [{ value: 1, label: '1.0' }, { value: 1.6, label: '1.6' }],
        },
        {
            key: 'n2',
            label: <span>介质2折射率 <MathKatexInline math="n_2" fallback="n₂" /></span>,
            type: 'slider',
            value: n2,
            min: 1,
            max: 1.6,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: setN2,
            marks: [{ value: 1, label: '1.0' }, { value: 1.6, label: '1.6' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>布儒斯特角 <MathKatexInline math="\\theta_B" fallback="θ_B" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={brewsterDeg.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前 <MathKatexInline math="R_s" fallback="Rs" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={current.Rs.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>当前 <MathKatexInline math="R_p" fallback="Rp" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={current.Rp.toFixed(5)} />
            </Stack>
        </>
    );

    const traces: Data[] = [
        {
            type: "scatter", mode: "lines", x: x, y: yRs,
            name: "Rs (s 分量)", line: { color: "#2563eb", width: 3 },
        },
        {
            type: "scatter", mode: "lines", x: x, y: yRp,
            name: "Rp (p 分量)", line: { color: "#16a34a", width: 3 },
        },
        {
            type: "scatter", mode: "markers", x: [crossing.x], y: [crossing.y],
            name: "Rs=Rp 交点", marker: { size: 9, color: "#7c3aed" },
        },
        {
            type: "scatter", mode: "markers", x: [brewsterPoint.x], y: [brewsterPoint.y],
            name: "Rp 消光", marker: { size: 10, color: "#dc2626", symbol: "diamond" },
        },
        {
            type: "scatter", mode: "markers", x: [theta], y: [current.Rs],
            name: "当前 θ 与 Rs 交点", marker: { size: 10, color: "#2563eb", symbol: "circle" },
        },
        {
            type: "scatter", mode: "markers", x: [theta], y: [current.Rp],
            name: "当前 θ 与 Rp 交点", marker: { size: 10, color: "#16a34a", symbol: "circle" },
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 20, l: 64, r: 12, b: 54 },
                xaxis: {
                    title: { text: "入射角 θ (°)" }, range: [0, 90],
                    showline: true, linewidth: 2, ticks: "outside", tickwidth: 2,
                    fixedrange: true,
                },
                yaxis: {
                    title: { text: "反射率" }, range: [0, 1.02],
                    showline: true, linewidth: 2, ticks: "outside", tickwidth: 2,
                    fixedrange: true,
                },
                shapes: [
                    {
                        type: "line",
                        x0: brewsterDeg, x1: brewsterDeg,
                        y0: 0, y1: 1.02,
                        line: { color: "#dc2626", width: 2, dash: "dot" },
                    },
                    {
                        type: "line",
                        x0: theta, x1: theta,
                        y0: 0, y1: 1.02,
                        line: { color: "#ea580c", width: 2, dash: "dash" },
                    },
                ],
                annotations: [
                    {
                        x: brewsterDeg, y: 0.96,
                        text: `θ_B=${brewsterDeg.toFixed(2)}°`,
                        showarrow: false, font: { color: "#dc2626" },
                    },
                    {
                        x: theta, y: 0.86,
                        text: `θ=${theta.toFixed(1)}°`,
                        showarrow: false, font: { color: "#ea580c" },
                    },
                ],
                legend: { orientation: "h", x: 0, y: 1.14 },
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
                        setN1(1);
                        setN2(1.5);
                        setTheta(0);
                    },
                },
                {
                    label: '布儒斯特角',
                    onClick: () => {
                        setN1(1);
                        setN2(1.5);
                        setTheta(Math.atan2(1.5, 1) * 180 / Math.PI);
                    },
                },
                {
                    label: '掠入射',
                    onClick: () => {
                        setN1(1);
                        setN2(1.5);
                        setTheta(80);
                    },
                },
            ]}
            hint={{
                title: '布儒斯特角・反射偏振',
                content: (
                    <span>
                        开车时过滤水面的眩光、激光偏振器的偏振光获取，都用到了布儒斯特角。调节两种介质的折射率
                        <MathKatexInline math="n_1/n_2" fallback="n1/n2" />、入射光角度
                        <MathKatexInline math="\theta" fallback="θ" />，当角度达到布儒斯特角时，反射光会变成纯线偏振光，且反射光与折射光相互垂直，清晰看到偏振光的产生条件。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'brewster-polarization-state',
                    type: 'single',
                    prompt: (
                        <span>
                            在布儒斯特角 <MathKatexInline math="\theta_B" fallback="θ_B" /> 入射时，反射光处于什么偏振状态？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">自然光（各方向随机振动）</span>,
                        <span key="q1-o2">线偏振光（仅保留垂直入射面的分量）</span>,
                        <span key="q1-o3">圆偏振光</span>,
                        <span key="q1-o4">椭圆偏振光</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：布儒斯特角时 <MathKatexInline math="R_p=0" fallback="Rp=0" />，反射光仅剩一种偏振方向，呈线偏振。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：布儒斯特角时反射光仅保留一种偏振方向，并非自然光或椭圆偏振光。
                        </span>
                    ),
                },
                {
                    id: 'brewster-orthogonal-angle',
                    type: 'single',
                    prompt: (
                        <span>
                            在布儒斯特角条件下，反射光与折射光夹角是多少？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1"><MathKatexInline math="45^\circ" fallback="45°" /></span>,
                        <span key="q2-o2"><MathKatexInline math="60^\circ" fallback="60°" /></span>,
                        <span key="q2-o3"><MathKatexInline math="90^\circ" fallback="90°" />（互相垂直）</span>,
                        <span key="q2-o4"><MathKatexInline math="180^\circ" fallback="180°" /></span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: (
                        <span>
                            正确：布儒斯特角时反射光与折射光互相垂直，夹角为 <MathKatexInline math="90^\circ" fallback="90°" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：结合布儒斯特角推导过程，反射光与折射光夹角是固定的特殊角度。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">布儒斯特角满足 <MathKatexInline math="\tan\theta_B=n_2/n_1" fallback="tanθ_B=n₂/n₁" />，由两介质折射率决定。</span>,
                '在该角度入射时，反射光呈线偏振，有利于偏振方向分离与分析。',
                <span key="s3">布儒斯特角条件下反射光与折射光互相垂直（夹角 <MathKatexInline math="90^\circ" fallback="90°" />）。</span>,
                <span key="s4"><MathKatexInline math="p" fallback="p" /> 偏振分量反射率趋近于 0（<MathKatexInline math="R_p\to 0" fallback="Rp→0" />），仅 <MathKatexInline math="s" fallback="s" /> 分量保留明显反射。</span>,
            ]}
            applicationItems={[
                '水面眩光过滤：在接近布儒斯特条件下，偏振镜可有效抑制特定反射分量，提升可见度。',
                '车窗反光控制：通过偏振方向选择减少玻璃表面强反射，提高驾驶与拍摄清晰度。',
                '激光偏振器：利用偏振选择特性得到稳定线偏振输出，便于后续光学测量与调制。',
            ]}
        />
    );
}
