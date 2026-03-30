'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import type { Data, Shape } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500} />),
});

const H_EV_S = 4.135667696e-15;

export default function Page() {
    const [workFunction, setWorkFunction] = React.useState<number>(2);
    const [frequency, setFrequency] = React.useState<number>(6e14);

    const nuMin = 3e14;
    const nuMax = 9e14;

    const uRaw = React.useMemo(() => H_EV_S * frequency - workFunction, [frequency, workFunction]);
    const uc = Math.max(0, uRaw);

    const thresholdFrequency = React.useMemo(() => workFunction / H_EV_S, [workFunction]);

    const graphNu = React.useMemo(() => {
        const points = 160;
        const step = (nuMax - nuMin) / (points - 1);
        return Array.from({ length: points }, (_, idx) => nuMin + idx * step);
    }, []);

    const graphLine = React.useMemo(
        () => graphNu.map((nu) => H_EV_S * nu - workFunction),
        [graphNu, workFunction],
    );

    const graphPhysical = React.useMemo(
        () => graphNu.map((nu) => Math.max(H_EV_S * nu - workFunction, 0)),
        [graphNu, workFunction],
    );

    const yMin = Math.min(-0.8, ...graphLine) * 1.05;
    const yMax = Math.max(0.8, ...graphPhysical, uc) * 1.2;

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphLine,
            line: { color: '#94a3b8', width: 2, dash: 'dot' },
            name: '理论直线 (h/e)ν-W/e',
        },
        {
            type: 'scatter',
            mode: 'lines',
            x: graphNu,
            y: graphPhysical,
            line: { color: '#2563eb', width: 3 },
            name: 'Uc(仅ν>ν0)',
        },
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [frequency],
            y: [uc],
            marker: { size: 9, color: uRaw >= 0 ? '#16a34a' : '#dc2626' },
            text: [uRaw >= 0 ? '当前 Uc' : '无光电子'],
            textposition: 'top center',
            name: '当前频率',
        },
    ];

    const shapes: Partial<Shape>[] = [
        {
            type: 'line',
            x0: nuMin,
            x1: nuMax,
            y0: 0,
            y1: 0,
            line: { color: '#94a3b8', width: 1.5, dash: 'dot' as const },
        },
        {
            type: 'line',
            x0: thresholdFrequency,
            x1: thresholdFrequency,
            y0: yMin,
            y1: yMax,
            line: { color: '#ef4444', width: 2, dash: 'dash' as const },
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'workFunction',
            label: <span>逸出功 <MathKatexInline math="W" fallback="W" /> (eV)</span>,
            type: 'slider',
            value: workFunction,
            min: 1,
            max: 4,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setWorkFunction,
            marks: [{ value: 1, label: '1' }, { value: 2, label: '2' }, { value: 4, label: '4' }],
        },
        {
            key: 'frequency',
            label: <span>频率 <MathKatexInline math="\nu" fallback="ν" /> (Hz)</span>,
            type: 'slider',
            value: frequency,
            min: nuMin,
            max: nuMax,
            step: 1e13,
            valueLabelDisplay: 'auto',
            onChange: setFrequency,
            marks: [{ value: 4.5e14, label: '4.5e14' }, { value: 6e14, label: '6e14' }, { value: 8e14, label: '8e14' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>遏止电压 <MathKatexInline math="U_c" fallback="Uc" /> (V)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={uc.toFixed(4)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>截止频率 <MathKatexInline math="\nu_0" fallback="ν0" /> (Hz)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={thresholdFrequency.toExponential(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="是否有光电流" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={uRaw > 0 ? '有' : '无'} />
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
                margin: { t: 24, l: 58, r: 24, b: 52 },
                xaxis: { title: { text: '频率 ν (Hz)' }, range: [nuMin, nuMax], fixedrange: true },
                yaxis: { title: { text: '遏止电压 Uc (V)' }, range: [yMin, yMax], fixedrange: true },
                shapes,
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.02,
                        y: 0.98,
                        text: `eUc=hν-W | W=${workFunction.toFixed(2)}eV, ν=${frequency.toExponential(2)}Hz`,
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
                    label: '标准',
                    onClick: () => {
                        setWorkFunction(2);
                        setFrequency(6e14);
                    },
                },
                {
                    label: '低频',
                    onClick: () => {
                        setWorkFunction(2);
                        setFrequency(4.5e14);
                    },
                },
                {
                    label: '高频',
                    onClick: () => {
                        setWorkFunction(2);
                        setFrequency(8e14);
                    },
                },
            ]}
            hint={{
                title: '遏止电压',
                content: (
                    <span>
                        同学们好，欢迎来到遏止电压实验。<br />
                        光电管的工作、测光仪的检测，都会用到遏止电压。调节入射光频率
                        <MathKatexInline math="\nu" fallback="ν" />、金属逸出功
                        <MathKatexInline math="W" fallback="W" />，能看到遏止电压
                        <MathKatexInline math="U_c" fallback="Uc" /> 的变化：频率越高，遏止电压越大，二者成线性关系，还能通过该实验测量普朗克常数
                        <MathKatexInline math="h" fallback="h" />。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'stopping-voltage-frequency-relation',
                    type: 'single',
                    prompt: (
                        <span>
                            遏止电压 <MathKatexInline math="U_c" fallback="Uc" /> 与入射光频率 <MathKatexInline math="\nu" fallback="ν" /> 的关系是？
                        </span>
                    ),
                    options: [
                        <span key="q1-o1">二者呈线性关系，频率越高，遏止电压越大</span>,
                        <span key="q1-o2">二者呈反比关系，频率越高，遏止电压越小</span>,
                        <span key="q1-o3">遏止电压恒定，不随频率变化</span>,
                        <span key="q1-o4">二者关系完全随机</span>,
                    ],
                    correctOptionIndex: 0,
                    successTip: (
                        <span>
                            正确：由 <MathKatexInline math="eU_c=h\nu-W" fallback="eUc=hν-W" /> 可知，
                            <MathKatexInline math="U_c" fallback="Uc" /> 随频率线性增加。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：遏止电压会随入射光频率的变化而变化，二者呈线性关联。
                        </span>
                    ),
                },
                {
                    id: 'stopping-voltage-intensity-relation',
                    type: 'single',
                    prompt: (
                        <span>
                            遏止电压 <MathKatexInline math="U_c" fallback="Uc" /> 与光强有什么关系？
                        </span>
                    ),
                    options: [
                        <span key="q2-o1">光强越大，遏止电压必然越大</span>,
                        <span key="q2-o2">遏止电压与光强无关</span>,
                        <span key="q2-o3">光强越小，遏止电压越大</span>,
                        <span key="q2-o4">遏止电压只由照射面积决定</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：<MathKatexInline math="U_c" fallback="Uc" /> 对应最大初动能阈值，主要由频率决定，与光强无关。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：遏止电压由光电子的最大初动能决定，与入射光的强度没有关系。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                <span key="s1">核心公式：<MathKatexInline math="eU_c=h\nu-W" fallback="eUc=hν-W" />。</span>,
                '在材料一定时，遏止电压随入射频率变化呈线性关系。',
                '遏止电压与光强无关，光强主要影响光电流大小。',
                '通过测量 Uc-ν 直线斜率可反推出普朗克常数 h。',
            ]}
            applicationItems={[
                '光电管可利用遏止电压特性进行频率与电子能量分析。',
                '测光仪在光电转换链路中使用相关原理实现光信号定量检测。',
                '量子物理实验通过 Uc-ν 关系验证爱因斯坦方程并测定基本常数。',
            ]}
        />
    );
}
