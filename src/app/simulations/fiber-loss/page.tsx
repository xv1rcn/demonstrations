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

export default function Page() {
    const [alpha, setAlpha] = React.useState<number>(0.2);
    const [distanceKm, setDistanceKm] = React.useState<number>(20);
    const [pin, setPin] = React.useState<number>(1);

    const hasError = alpha <= 0 || distanceKm <= 0;

    const pOut = React.useMemo(() => {
        if (hasError) return 0;
        return pin * Math.pow(10, -alpha * distanceKm / 10);
    }, [hasError, pin, alpha, distanceKm]);

    const totalLossDb = alpha * distanceKm;
    const efficiencyPct = pin > 1e-9 ? (pOut / pin) * 100 : 0;

    const lAxis = React.useMemo(() => Array.from({ length: 1001 }, (_, i) => i * 0.2), []);
    const powerCurve = React.useMemo(() => {
        if (hasError) return lAxis.map(() => 0);
        return lAxis.map((l) => pin * Math.pow(10, -alpha * l / 10));
    }, [hasError, lAxis, pin, alpha]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'alpha',
            label: <span>光纤损耗系数 <MathKatexInline math="\\alpha" fallback="α" /> (dB/km)</span>,
            type: 'slider',
            value: alpha,
            min: 0.1,
            max: 2,
            step: 0.01,
            onChange: setAlpha,
            tipIncrease: '调大光纤的损耗系数，光信号在传输过程中的能量衰减速度会变快，相同距离下输出的光功率会变得更小，通信质量降低。',
            tipDecrease: '调小损耗系数，能量衰减速度变慢，相同距离下输出光功率更大，通信更稳定。',
            marks: [{ value: 0.1, label: '0.1' }, { value: 1, label: '1.0' }, { value: 2, label: '2.0' }],
        },
        {
            key: 'distanceKm',
            label: <span>传输距离 <MathKatexInline math="L" fallback="L" /> (km)</span>,
            type: 'slider',
            value: distanceKm,
            min: 1,
            max: 100,
            step: 0.5,
            onChange: setDistanceKm,
            tipIncrease: '调大光纤的传输距离，光信号的能量衰减程度会增加，输出的光功率会变小，距离过远可能出现信号中断。',
            tipDecrease: '调小传输距离，能量衰减程度降低，输出光功率更大，信号更稳定。',
            marks: [{ value: 1, label: '1' }, { value: 20, label: '20' }, { value: 50, label: '50' }, { value: 100, label: '100' }],
        },
        {
            key: 'pin',
            label: <span>输入光功率 <MathKatexInline math="P_{in}" fallback="Pin" /></span>,
            type: 'slider',
            value: pin,
            min: 0,
            max: 1,
            step: 0.01,
            onChange: setPin,
            tipIncrease: '调大入射光的功率，相同损耗和距离下，输出的光功率会相应增大，信号的抗衰减能力更强。',
            tipDecrease: '调小入射光功率，输出光功率更小，易出现信号衰减。',
            marks: [{ value: 0, label: '0' }, { value: 0.5, label: '0.5' }, { value: 1, label: '1.0' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>输出光功率 <MathKatexInline math="P_{out}" fallback="Pout" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={pOut.toFixed(5)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="总损耗 (dB)" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={totalLossDb.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="传输效率 (%)" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={efficiencyPct.toFixed(3)} />
            </Stack>
            {hasError && <Alert severity="error">损耗系数/传输距离必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: lAxis,
            y: powerCurve,
            line: { color: '#2563eb', width: 3 },
            xaxis: 'x',
            yaxis: 'y',
            name: 'Pout(L)',
        },
        // 垂直线指示当前传输距离
        {
            type: 'scatter',
            mode: 'lines',
            x: [distanceKm, distanceKm],
            y: [0, pin * Math.pow(10, -alpha * distanceKm / 10)],
            line: { color: '#f59e42', width: 2, dash: 'dash' },
            name: '当前距离',
            showlegend: false,
            hoverinfo: 'skip',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 34, l: 58, r: 26, b: 52 },
                xaxis: { title: { text: '距离 L (km)' }, range: [0, 100], fixedrange: true },
                yaxis: { title: { text: '输出光功率 Pout' }, range: [0, 1.02], fixedrange: true },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        text: `Pout=Pin·10^(-αL/10), α=${alpha.toFixed(3)} dB/km`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
                    },
                    {
                        x: distanceKm,
                        y: pin * Math.pow(10, -alpha * distanceKm / 10),
                        xref: 'x',
                        yref: 'y',
                        text: `L=${distanceKm} km`,
                        showarrow: true,
                        arrowhead: 6,
                        ax: 0,
                        ay: -60,
                        bgcolor: '#fffbe7',
                        bordercolor: '#f59e42',
                        borderwidth: 1,
                        font: { color: '#b45309', size: 13 },
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
                {
                    label: '🏠家用宽带型',
                    tip: '对应家用光纤宽带的传输状态，光纤损耗低，传输距离适中，光信号在传输过程中能量损耗小，能保证家庭网络的稳定传输。',
                    onClick: () => { setAlpha(0.2); setDistanceKm(20); setPin(1); }
                },
                {
                    label: '🧵劣质光纤型',
                    tip: '对应劣质光纤的传输状态，光纤损耗高，即使传输距离适中，光信号的能量也会快速衰减，出现网络卡顿、信号中断的情况。',
                    onClick: () => { setAlpha(1.0); setDistanceKm(20); setPin(1); }
                },
                {
                    label: '🌊海底光缆型',
                    tip: '对应海底长距离光缆的传输状态，光纤损耗极低，传输距离极长，光信号能在海底实现数千公里的稳定传输，仅出现轻微的能量损耗。',
                    onClick: () => { setAlpha(0.2); setDistanceKm(100); setPin(1); }
                },
            ]}
            hint={{
                title: '光纤损耗・长距离通信',
                content: (
                    <span>
                        同学们好，欢迎来到光纤损耗・长距离通信实验。<br />
                        光纤宽带、海底光缆与光纤传感系统都需要进行链路损耗评估。调节损耗系数
                        <MathKatexInline math="\\alpha" fallback="α" />（dB/km）与传输距离
                        <MathKatexInline math="L" fallback="L" />，可以观察输出光功率
                        <MathKatexInline math="P_{out}" fallback="Pout" /> 的变化规律：
                        <MathKatexInline math="\\alpha" fallback="α" /> 越大或
                        <MathKatexInline math="L" fallback="L" /> 越长，功率衰减越明显。工程上常选 1550nm 波段进行长距离传输，
                        因其损耗更低、传输更稳定。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'fiber-alpha-trend',
                    type: 'single',
                    prompt: <span>光纤损耗系数越大，在相同传输距离下输出光功率将如何变化？</span>,
                    options: [
                        <span key="q1-o1">输出光功率增大，衰减变慢</span>,
                        <span key="q1-o2">输出光功率减小，衰减变快</span>,
                        <span key="q1-o3">输出光功率不变</span>,
                        <span key="q1-o4">先增大后减小</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：损耗系数越大，单位长度功率损失越大，因此输出光功率更小、衰减更快。</span>,
                    failTip: <span>提示：根据 <MathKatexInline math="P_{out}=P_{in}\cdot10^{-\\alpha L/10}" fallback="Pout=Pin·10^(-αL/10)" />，<MathKatexInline math="\\alpha" fallback="α" /> 增大时指数项变小，输出功率会下降。</span>,
                },
                {
                    id: 'fiber-distance-trend',
                    type: 'single',
                    prompt: <span>当损耗系数固定时，传输距离增加会使输出光功率如何变化？</span>,
                    options: [
                        <span key="q2-o1">输出光功率线性增大</span>,
                        <span key="q2-o2">输出光功率保持恒定</span>,
                        <span key="q2-o3">输出光功率按对数规律衰减，距离越长越小</span>,
                        <span key="q2-o4">输出光功率仅与输入功率有关，与距离无关</span>,
                    ],
                    correctOptionIndex: 2,
                    successTip: <span>正确：在 dB 表达下，功率随距离呈对数衰减，传输越远，输出光功率越低。</span>,
                    failTip: <span>提示：距离增加会累计损耗，链路总损耗 <MathKatexInline math="\\alpha L" fallback="αL" /> 变大，输出功率持续下降。</span>,
                },
            ]}
            summaryItems={[
                <span key="s1">光纤功率按对数衰减：<MathKatexInline math="P_{out}=P_{in}\cdot10^{-\\alpha L/10}" fallback="Pout=Pin·10^(-αL/10)" />。</span>,
                <span key="s2">单位：损耗 <MathKatexInline math="\\alpha" fallback="α" />（dB/km），距离 <MathKatexInline math="L" fallback="L" />（km）。</span>,
                '1550nm 波段损耗最低，适合长途传输。',
                '损耗来源：吸收、散射、弯曲。',
                '距离越长、损耗越大，通信质量越低。',
            ]}
            applicationItems={[
                '光纤宽带通信可依据链路损耗模型进行功率预算，保障用户端接收信号质量。',
                '海底长距离光缆工程需要综合距离与损耗系数，优化中继间距和放大策略。',
                '光纤传感与监测系统可通过回波光强衰减变化识别环境扰动和链路异常。',
            ]}
        />
    );
}
