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

const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;

export default function Page() {
    const [n1, setN1] = React.useState<number>(1.5);
    const [n2, setN2] = React.useState<number>(1.0);
    const [thetaIncident, setThetaIncident] = React.useState<number>(0);

    const thetaCritical = React.useMemo(() => {
        if (n1 <= n2) return null;
        const ratio = Math.max(0, Math.min(1, n2 / n1));
        return toDeg(Math.asin(ratio));
    }, [n1, n2]);

    const isTotalInternalReflection = React.useMemo(() => {
        if (thetaCritical === null) return false;
        return thetaIncident > thetaCritical;
    }, [thetaIncident, thetaCritical]);

    const reflectedIntensity = React.useMemo(() => {
        if (thetaCritical === null) return 0;
        if (isTotalInternalReflection) return 1;
        return Math.min(1, Math.pow(thetaIncident / Math.max(thetaCritical, 1e-6), 2));
    }, [thetaIncident, thetaCritical, isTotalInternalReflection]);

    const rayLength = 1;
    const incidentX = -rayLength * Math.sin(toRad(thetaIncident));
    const incidentY = -rayLength * Math.cos(toRad(thetaIncident));
    const reflectX = rayLength * Math.sin(toRad(thetaIncident));
    const reflectY = -rayLength * Math.cos(toRad(thetaIncident));

    const transmitted = React.useMemo(() => {
        if (isTotalInternalReflection || n1 <= n2) {
            return { x: 0, y: 0, valid: false };
        }
        const sinThetaT = (n1 / n2) * Math.sin(toRad(thetaIncident));
        if (Math.abs(sinThetaT) > 1) {
            return { x: 0, y: 0, valid: false };
        }
        const thetaT = Math.asin(sinThetaT);
        return {
            x: rayLength * Math.sin(thetaT),
            y: rayLength * Math.cos(thetaT),
            valid: true,
        };
    }, [isTotalInternalReflection, n1, n2, thetaIncident]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'n1',
            label: <span>入射介质折射率 <MathKatexInline math="n_1" fallback="n₁" /></span>,
            type: 'slider',
            value: n1,
            min: 1.0,
            max: 2.0,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: (value) => {
                setN1(value);
                setN2((prev) => Math.min(prev, value));
            },
            marks: [
                { value: 1.0, label: '1.0' },
                { value: 2.0, label: '2.0' },
            ],
        },
        {
            key: 'n2',
            label: <span>折射介质折射率 <MathKatexInline math="n_2" fallback="n₂" /></span>,
            type: 'slider',
            value: Math.min(n2, n1),
            min: 1.0,
            max: n1,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: (value) => setN2(Math.min(value, n1)),
            marks: [
                { value: 1.0, label: '1.0' },
                { value: n1, label: n1.toFixed(2) },
            ],
        },
        {
            key: 'thetaIncident',
            label: <span>入射角 <MathKatexInline math="\\theta_i" fallback="θᵢ" /> (°)</span>,
            type: 'slider',
            value: thetaIncident,
            min: 0,
            max: 80,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setThetaIncident,
            marks: [
                { value: 0, label: '0' },
                { value: 40, label: '40' },
                { value: 80, label: '80' },
            ],
        },
    ];

    const thetaCriticalText = thetaCritical === null
        ? '无临界角（n₁≤n₂）'
        : `${thetaCritical.toFixed(3)}°`;

    const stateText = thetaCritical !== null && isTotalInternalReflection
        ? '全反射'
        : '部分折射';

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>临界角 <MathKatexInline math="\\theta_c" fallback="θc" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={thetaCriticalText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="当前状态" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={stateText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="反射强度（示意）" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={reflectedIntensity.toFixed(3)} />
            </Stack>
        </>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: [incidentX, 0],
            y: [incidentY, 0],
            line: { color: '#2563eb', width: 4 },
            name: '入射光',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [0, reflectX],
            y: [0, reflectY],
            line: { color: '#16a34a', width: 4 },
            name: '反射光',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: [0, transmitted.x],
            y: [0, transmitted.y],
            line: {
                color: isTotalInternalReflection ? '#9ca3af' : '#dc2626',
                width: 4,
                dash: isTotalInternalReflection ? 'dot' : 'solid',
            },
            name: isTotalInternalReflection ? '无折射（全反射）' : '折射光',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 20, l: 20, r: 20, b: 20 },
                xaxis: { range: [-1.1, 1.1], visible: false, fixedrange: true },
                yaxis: { range: [-1.1, 1.1], visible: false, scaleanchor: 'x', scaleratio: 1, fixedrange: true },
                shapes: [
                    {
                        type: 'line',
                        x0: -1.1,
                        x1: 1.1,
                        y0: 0,
                        y1: 0,
                        line: { color: '#111827', width: 2 },
                    },
                    {
                        type: 'line',
                        x0: 0,
                        x1: 0,
                        y0: -1.1,
                        y1: 1.1,
                        line: { color: '#6b7280', width: 2, dash: 'dot' },
                    },
                ],
                annotations: [
                    {
                        x: -0.9,
                        y: -0.95,
                        text: `n1=${n1.toFixed(2)}（光密）`,
                        showarrow: false,
                    },
                    {
                        x: -0.9,
                        y: 0.95,
                        text: `n2=${n2.toFixed(2)}（光疏）`,
                        showarrow: false,
                    },
                    {
                        x: 0.72,
                        y: 0.95,
                        text: `θi=${thetaIncident.toFixed(1)}°`,
                        showarrow: false,
                        font: { color: '#2563eb' },
                    },
                    {
                        x: 0.72,
                        y: 0.84,
                        text: thetaCritical === null
                            ? '状态：无全反射条件'
                            : (isTotalInternalReflection ? '状态：全反射' : '状态：部分折射'),
                        showarrow: false,
                        font: { color: isTotalInternalReflection ? '#dc2626' : '#16a34a' },
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `sinθc=n2/n1 | θc=${thetaCritical === null ? '—' : `${thetaCritical.toFixed(2)}°`}`,
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
                    label: '玻璃→空气',
                    onClick: () => {
                        setN1(1.5);
                        setN2(1.0);
                        setThetaIncident(0);
                    },
                },
                {
                    label: '临界状态',
                    onClick: () => {
                        setN1(1.5);
                        setN2(1.0);
                        setThetaIncident(41.8);
                    },
                },
                {
                    label: '全反射',
                    onClick: () => {
                        setN1(1.5);
                        setN2(1.0);
                        setThetaIncident(50);
                    },
                },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'critical-condition-media-order',
                    type: 'single',
                    prompt: (
                        <span>
                            发生全反射的必要条件之一是什么？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">光从光疏介质射向光密介质，且 <MathKatexInline math="n_1<n_2" fallback="n₁<n₂" /></span>,
                        <span key="q1-o2">光必须从光密介质射向光疏介质，且 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" /></span>,
                        <span key="q1-o3">只要入射角足够大即可，与 <MathKatexInline math="n_1,n_2" fallback="n₁,n₂" /> 无关</span>,
                        <span key="q1-o4">两介质折射率必须完全相同</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：全反射必须先满足光由光密到光疏传播，即 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：全反射的发生，必须满足介质折射率的特定大小关系，再仔细回忆条件哦。
                        </span>
                    ),
                },
                {
                    id: 'critical-angle-exceeding-result',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射角 <MathKatexInline math="\\theta_i" fallback="θᵢ" /> 大于临界角 <MathKatexInline math="\\theta_c" fallback="θc" /> 时，会发生什么现象？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">折射角变小，折射光增强</span>,
                        <span key="q2-o2">光全部反射，无折射光（发生全反射）</span>,
                        <span key="q2-o3">入射光消失，既无反射也无折射</span>,
                        <span key="q2-o4">反射光与折射光各占一半且始终不变</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：当 <MathKatexInline math="\\theta_i>\\theta_c" fallback="θᵢ>θc" /> 时，折射光消失，能量全部反射，进入全反射状态。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：入射角只有超过临界角，才会出现无折射光、全反射的现象。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">全反射条件：光由光密介质射向光疏介质（<MathKatexInline math="n_1>n_2" fallback="n₁>n₂" />）且 <MathKatexInline math="\\theta_i>\\theta_c" fallback="θᵢ>θc" />。</span>,
                <span key="s2">临界角公式：<MathKatexInline math="\\sin\\theta_c=\\frac{n_2}{n_1}" fallback="sinθc=n₂/n₁" />，仅在 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" /> 时有意义。</span>,
                '当入射角超过临界角后，折射光不再存在，入射能量全部转入反射通道。',
                '全反射损耗低、导光效率高，是现代光纤通信实现远距离传输的重要物理基础。',
            ]}
            applicationItems={[
                '光纤通信：利用纤芯与包层折射率差，让光在纤芯内连续全反射并低损耗传输。',
                '钻石闪光：高折射率材料对应较小临界角，光在内部多次全反射后更容易从合适方向射出，显得更闪耀。',
                '水中气泡发亮：水-空气界面易满足光密到光疏与大入射角条件，气泡边缘常出现强反射亮纹。',
            ]}
        />
    );
}
