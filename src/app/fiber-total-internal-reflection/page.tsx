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

const toDegree = (rad: number) => rad * 180 / Math.PI;
const toRadian = (deg: number) => deg * Math.PI / 180;

const guidedRayPath = (thetaCoreDeg: number, length: number, coreHeight: number) => {
    const xPoints: number[] = [0];
    const yPoints: number[] = [0];

    const slopeAbs = Math.tan(toRadian(thetaCoreDeg));
    if (slopeAbs < 1e-6) {
        xPoints.push(length);
        yPoints.push(0);
        return { x: xPoints, y: yPoints };
    }

    const halfH = coreHeight / 2;
    let x = 0;
    let y = 0;
    let direction = 1;

    while (x < length) {
        const slope = direction * slopeAbs;
        const targetY = direction > 0 ? halfH : -halfH;
        const dx = (targetY - y) / slope;

        if (x + dx >= length) {
            const yEnd = y + slope * (length - x);
            xPoints.push(length);
            yPoints.push(yEnd);
            break;
        }

        x += dx;
        y = targetY;
        xPoints.push(x);
        yPoints.push(y);
        direction *= -1;
    }

    return { x: xPoints, y: yPoints };
};

const leakedRayPath = (thetaCoreDeg: number, length: number, coreHeight: number, n1: number, n2: number) => {
    const slopeAbs = Math.tan(toRadian(thetaCoreDeg));
    const halfH = coreHeight / 2;

    if (slopeAbs < 1e-6) {
        return {
            inCore: { x: [0, length], y: [0, 0] },
            inCladding: { x: [] as number[], y: [] as number[] },
        };
    }

    const hitX = halfH / slopeAbs;
    if (hitX >= length) {
        return {
            inCore: { x: [0, length], y: [0, slopeAbs * length] },
            inCladding: { x: [] as number[], y: [] as number[] },
        };
    }

    const thetaIncidenceDeg = 90 - thetaCoreDeg;
    const sinThetaT = (n1 / n2) * Math.sin(toRadian(thetaIncidenceDeg));
    if (Math.abs(sinThetaT) > 1) {
        return {
            inCore: { x: [0, length], y: [0, slopeAbs * length] },
            inCladding: { x: [] as number[], y: [] as number[] },
        };
    }

    const thetaTdeg = toDegree(Math.asin(Math.max(-1, Math.min(1, sinThetaT))));
    const thetaCladdingFromAxisDeg = 90 - thetaTdeg;
    const claddingSlope = Math.tan(toRadian(thetaCladdingFromAxisDeg));
    return {
        inCore: { x: [0, hitX], y: [0, halfH] },
        inCladding: { x: [hitX, length], y: [halfH, halfH + (length - hitX) * claddingSlope] },
    };
};

export default function Page() {
    const [n1, setN1] = React.useState<number>(1.48);
    const [n2, setN2] = React.useState<number>(1.46);
    const [thetaIn, setThetaIn] = React.useState<number>(10);

    const na = React.useMemo(
        () => Math.sqrt(Math.max(0, n1 * n1 - n2 * n2)),
        [n1, n2],
    );

    const thetaCritical = React.useMemo(() => {
        if (n1 <= n2) return null;
        return toDegree(Math.asin(Math.max(0, Math.min(1, n2 / n1))));
    }, [n1, n2]);

    const thetaCore = React.useMemo(() => {
        const sinThetaCore = Math.sin(toRadian(thetaIn)) / n1;
        return toDegree(Math.asin(Math.max(-1, Math.min(1, sinThetaCore))));
    }, [thetaIn, n1]);

    const thetaIncidence = React.useMemo(() => 90 - thetaCore, [thetaCore]);

    const isTotalInternalReflection = React.useMemo(() => {
        if (thetaCritical === null) return false;
        return thetaIncidence > thetaCritical;
    }, [thetaIncidence, thetaCritical]);

    const length = 10;
    const coreHeight = 2;

    const guided = React.useMemo(
        () => guidedRayPath(thetaCore, length, coreHeight),
        [thetaCore],
    );

    const leaked = React.useMemo(
        () => leakedRayPath(thetaCore, length, coreHeight, n1, n2),
        [thetaCore, n1, n2],
    );

    const hasLeakedPath = leaked.inCladding.x.length >= 2;

    const parameterItems: ParameterItem[] = [
        {
            key: 'n1',
            label: <span>纤芯折射率 <MathKatexInline math="n_1" fallback="n₁" /></span>,
            type: 'slider',
            value: n1,
            min: 1.40,
            max: 1.60,
            step: 0.001,
            valueLabelDisplay: 'auto',
            onChange: (value) => {
                setN1(value);
                setN2((prev) => Math.min(prev, value));
            },
            marks: [
                { value: 1.40, label: '1.40' },
                { value: 1.60, label: '1.60' },
            ],
        },
        {
            key: 'n2',
            label: <span>包层折射率 <MathKatexInline math="n_2" fallback="n₂" /></span>,
            type: 'slider',
            value: Math.min(n2, n1),
            min: 1.30,
            max: n1,
            step: 0.001,
            valueLabelDisplay: 'auto',
            onChange: (value) => setN2(Math.min(value, n1)),
            marks: [
                { value: 1.30, label: '1.30' },
                { value: n1, label: n1.toFixed(3) },
            ],
        },
        {
            key: 'thetaIn',
            label: <span>入射角 <MathKatexInline math="\\theta_{in}" fallback="θin" /> (°)</span>,
            type: 'slider',
            value: thetaIn,
            min: 0,
            max: 35,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setThetaIn,
            marks: [
                { value: 0, label: '0' },
                { value: 20, label: '20' },
                { value: 35, label: '35' },
            ],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>临界角 <MathKatexInline math="\\theta_c" fallback="θc" /> (°)</span>} variant="outlined" className="w-56" />
                <TextField
                    disabled
                    hiddenLabel
                    size="small"
                    variant="standard"
                    value={thetaCritical === null ? '无临界角' : thetaCritical.toFixed(3)}
                />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>数值孔径 <MathKatexInline math="NA" fallback="NA" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={na.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="传输状态" variant="outlined" className="w-56" />
                <TextField
                    disabled
                    hiddenLabel
                    size="small"
                    variant="standard"
                    value={isTotalInternalReflection ? '可导光（全反射）' : '易漏光（不满足全反射）'}
                />
            </Stack>
        </>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: isTotalInternalReflection ? guided.x : leaked.inCore.x,
            y: isTotalInternalReflection ? guided.y : leaked.inCore.y,
            line: { color: '#2563eb', width: 4 },
            name: '纤芯内光路',
            showlegend: true,
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: hasLeakedPath ? leaked.inCladding.x : [0],
            y: hasLeakedPath ? leaked.inCladding.y : [0],
            line: { color: '#dc2626', width: 4, dash: 'dash' },
            name: '泄漏光路',
            visible: hasLeakedPath ? true : 'legendonly',
            showlegend: true,
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 22, l: 24, r: 24, b: 20 },
                xaxis: { range: [0, length], visible: false, fixedrange: true },
                yaxis: { range: [-3.2, 3.2], visible: false, scaleanchor: 'x', scaleratio: 1, fixedrange: true },
                shapes: [
                    {
                        type: 'rect',
                        x0: 0,
                        x1: length,
                        y0: -coreHeight / 2,
                        y1: coreHeight / 2,
                        line: { color: '#111827', width: 2 },
                        fillcolor: 'rgba(37,99,235,0.08)',
                    },
                    {
                        type: 'rect',
                        x0: 0,
                        x1: length,
                        y0: coreHeight / 2,
                        y1: 3,
                        line: { color: '#9ca3af', width: 1 },
                        fillcolor: 'rgba(107,114,128,0.08)',
                    },
                    {
                        type: 'rect',
                        x0: 0,
                        x1: length,
                        y0: -3,
                        y1: -coreHeight / 2,
                        line: { color: '#9ca3af', width: 1 },
                        fillcolor: 'rgba(107,114,128,0.08)',
                    },
                ],
                annotations: [
                    {
                        x: 1,
                        y: 0,
                        text: `纤芯 n1=${n1.toFixed(3)}`,
                        showarrow: false,
                    },
                    {
                        x: 1,
                        y: 2.6,
                        text: `包层 n2=${n2.toFixed(3)}`,
                        showarrow: false,
                    },
                    {
                        x: 7.9,
                        y: 2.6,
                        text: isTotalInternalReflection ? '状态：反弹导光' : '状态：发生漏光',
                        showarrow: false,
                        font: { color: isTotalInternalReflection ? '#16a34a' : '#dc2626' },
                    },
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `NA=√(n1²-n2²)=${na.toFixed(3)} | θin=${thetaIn.toFixed(1)}°`,
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
                    label: '标准光纤',
                    onClick: () => {
                        setN1(1.48);
                        setN2(1.46);
                        setThetaIn(10);
                    },
                },
                {
                    label: '易传输',
                    onClick: () => {
                        setN1(1.55);
                        setN2(1.40);
                        setThetaIn(10);
                    },
                },
                {
                    label: '易漏光',
                    onClick: () => {
                        setN1(1.44);
                        setN2(1.43);
                        setThetaIn(25);
                    },
                },
            ]}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'fiber-index-relation',
                    type: 'single',
                    prompt: (
                        <span>
                            光纤纤芯和包层折射率必须满足什么关系，才能保证导光条件？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">纤芯折射率必须小于包层折射率，即 <MathKatexInline math="n_1<n_2" fallback="n₁<n₂" /></span>,
                        <span key="q1-o2">纤芯折射率必须大于包层折射率，即 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" /></span>,
                        <span key="q1-o3">纤芯与包层折射率必须相等，即 <MathKatexInline math="n_1=n_2" fallback="n₁=n₂" /></span>,
                        <span key="q1-o4">折射率大小关系不影响光纤导光</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：为满足全反射导光，光纤结构应满足 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" />。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：光纤能正常传光，核心是纤芯与包层的折射率满足全反射条件。
                        </span>
                    ),
                },
                {
                    id: 'fiber-large-input-angle',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射角 <MathKatexInline math="\\theta_{in}" fallback="θin" /> 过大时，光纤会出现什么问题？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">光沿纤芯传播更稳定，不会损耗</span>,
                        <span key="q2-o2">光发生漏光，无法在光纤内正常传输</span>,
                        <span key="q2-o3">光会在纤芯内完全静止</span>,
                        <span key="q2-o4">光自动增加波长并保持全反射</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：入射角过大时，边界处不能持续满足全反射条件，部分光会耦合进包层形成泄漏。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：入射角度过大时，光无法在纤芯内发生全反射，会出现泄漏现象。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">光纤导光的基本结构条件是纤芯与包层满足 <MathKatexInline math="n_1>n_2" fallback="n₁>n₂" />。</span>,
                <span key="s2">数值孔径定义为 <MathKatexInline math="NA=\\sqrt{n_1^2-n_2^2}" fallback="NA=√(n₁²-n₂²)" />，反映光纤接受并约束光线的能力。</span>,
                '光在纤芯-包层边界发生多次全反射并沿轴向前进，是低损耗长距离传输的核心机制。',
                '当入射角过大或参数搭配不当时，会破坏全反射条件并导致漏光，传输质量下降。',
            ]}
            applicationItems={[
                '光纤宽带通过低损耗导光链路承载高速数据流，实现大带宽、远距离网络接入。',
                '医疗内窥镜利用细光纤束传输照明与图像信号，支持微创环境下的实时观察。',
                '海底光缆采用多层保护与中继系统，把光纤全反射传输能力用于跨洋通信主干网。',
            ]}
        />
    );
}
