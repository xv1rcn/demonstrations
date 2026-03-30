'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Chip, Skeleton, Stack, TextField } from "@mui/material";
import { SimulationPageTemplate } from "@/components/simulation-page-template";
import { MathKatexInline } from "@/components/math-katex-inline";
import { type ParameterItem } from "@/components/parameter-controls";
import { wavelengthToRgb } from "@/lib/utils";
import type { Data } from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500} />),
});

const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;

export default function Page() {
    const [dUm, setDUm] = React.useState<number>(2);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [incidenceDeg, setIncidenceDeg] = React.useState<number>(0);

    const dNm = dUm * 1000;
    const sinI = Math.sin(toRad(incidenceDeg));

    const calcTheta = React.useCallback((m: number) => {
        const arg = m * lambdaNm / dNm + sinI;
        if (Math.abs(arg) > 1) return null;
        return toDeg(Math.asin(arg));
    }, [dNm, lambdaNm, sinI]);

    const theta1 = calcTheta(1);
    const theta2 = calcTheta(2);
    const theta3 = calcTheta(3);

    const theta1Text = theta1 === null ? '不可见（超出90°）' : `${theta1.toFixed(3)}°`;
    const theta2Text = theta2 === null ? '不可见（超出90°）' : `${theta2.toFixed(3)}°`;
    const highOrderText = theta3 === null ? '否（m=3已超出90°）' : '是（可见m≥3）';

    const minOrder = Math.ceil(((-1 - sinI) * dNm) / lambdaNm);
    const maxOrder = Math.floor(((1 - sinI) * dNm) / lambdaNm);
    const orders = Array.from(
        { length: Math.max(0, maxOrder - minOrder + 1) },
        (_, idx) => minOrder + idx,
    );
    const validOrders = orders
        .map((m) => {
            const theta = calcTheta(m);
            return theta === null ? null : { m, theta };
        })
        .filter((v): v is { m: number; theta: number } => v !== null)
        .filter((v) => v.theta >= -89.9 && v.theta <= 89.9);

    const lineColor = wavelengthToRgb(lambdaNm);

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: [-90, 90],
            y: [0, 0],
            line: { color: '#111827', width: 2 },
            name: '角度轴',
        },
        ...validOrders.map((item, idx) => {
            const amp = 0.95 - 0.08 * Math.abs(item.m);
            const yTop = Math.max(0.2, amp);
            return {
                type: 'scatter' as const,
                mode: 'text+lines' as const,
                x: [item.theta, item.theta],
                y: [0, yTop],
                line: { color: lineColor, width: 3 },
                text: ['', `m=${item.m}`],
                textposition: 'top center' as const,
                name: idx === 0 ? '主极大谱线' : undefined,
                showlegend: idx === 0,
            };
        }),
        {
            type: 'scatter',
            mode: 'text+markers',
            x: [incidenceDeg],
            y: [0],
            marker: { size: 8, color: '#334155' },
            text: ['入射方向'],
            textposition: 'bottom center',
            name: '入射角',
        },
    ];

    const parameterItems: ParameterItem[] = [
        {
            key: 'dUm',
            label: <span>光栅常数 <MathKatexInline math="d" fallback="d" /> (μm)</span>,
            type: 'slider',
            value: dUm,
            min: 1,
            max: 10,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setDUm,
            marks: [
                { value: 1, label: '1' },
                { value: 10, label: '10' },
            ],
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
            marks: [
                { value: 400, label: '400' },
                { value: 700, label: '700' },
            ],
        },
        {
            key: 'incidenceDeg',
            label: <span>入射角 <MathKatexInline math="\\theta_i" fallback="θᵢ" /> (°)</span>,
            type: 'slider',
            value: incidenceDeg,
            min: 0,
            max: 20,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setIncidenceDeg,
            marks: [
                { value: 0, label: '0' },
                { value: 20, label: '20' },
            ],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>1级衍射角 <MathKatexInline math="\\theta_1" fallback="θ₁" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={theta1Text} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>2级衍射角 <MathKatexInline math="\\theta_2" fallback="θ₂" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={theta2Text} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip
                    label={<span>可见高级次（<MathKatexInline math="m\\ge 3" fallback="m≥3" />）?</span>}
                    variant="outlined"
                    className="w-56"
                />
                <TextField disabled hiddenLabel size="small" variant="standard" value={highOrderText} />
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
                margin: { t: 24, l: 54, r: 24, b: 52 },
                xaxis: {
                    title: { text: '衍射角 θ (°)' },
                    range: [-90, 90],
                    fixedrange: true,
                    zeroline: true,
                },
                yaxis: {
                    title: { text: '相对强度（示意）' },
                    range: [-0.25, 1.05],
                    fixedrange: true,
                },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 0.98,
                        text: `d·sinθ = mλ | d=${dUm.toFixed(2)}μm, λ=${lambdaNm.toFixed(0)}nm`,
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
                    label: '默认参数',
                    onClick: () => {
                        setDUm(2);
                        setLambdaNm(550);
                        setIncidenceDeg(0);
                    },
                },
                {
                    label: '高色散',
                    onClick: () => {
                        setDUm(1);
                        setLambdaNm(700);
                        setIncidenceDeg(0);
                    },
                },
                {
                    label: '低色散',
                    onClick: () => {
                        setDUm(10);
                        setLambdaNm(400);
                        setIncidenceDeg(0);
                    },
                },
            ]}
            hint={{
                title: '平面光栅衍射',
                content: (
                    <span>
                        同学们好，欢迎来到平面光栅衍射实验。<br />
                        CD光盘反光的彩色纹路、手机光谱仪的分光效果，核心是光栅衍射。调节光栅常数
                        <MathKatexInline math="d" fallback="d" />、入射光波长
                        <MathKatexInline math="\lambda" fallback="λ" />，可看到光谱的色散变化：光栅越密（
                        <MathKatexInline math="d" fallback="d" /> 越小）、波长越长，衍射角越大，色散效果越强，能直观看到白光被分解为七色光谱的过程。<br />
                        请根据“生活场景切入→参数可视化探究→知识问答巩固→实际应用关联”的顺序进行学习。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'grating-density-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当光栅常数 <MathKatexInline math="d" fallback="d" /> 变小（光栅更密）且波长 <MathKatexInline math="\lambda" fallback="λ" /> 不变时，同一级谱线衍射角 <MathKatexInline math="\theta" fallback="θ" /> 会如何变化？
                        </span>
                    ),
                    options: ['同一级谱线衍射角变大', '同一级谱线衍射角变小', '衍射角基本不变', '只有中央亮纹变化，衍射角不变'],
                    correctOptionIndex: 0,
                    successTip: (
                        <span>
                            正确：光栅更密时，对光偏折更强，同级谱线向外偏移，即 <MathKatexInline math="\theta" fallback="θ" /> 增大。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：光栅越密（<MathKatexInline math="d" fallback="d" /> 越小），偏折更强；结合
                            <MathKatexInline math="d\sin\theta = m\lambda" fallback="d·sinθ = mλ" />
                            判断 <MathKatexInline math="\theta" fallback="θ" /> 的变化。
                        </span>
                    ),
                },
                {
                    id: 'grating-wavelength-effect',
                    type: 'single',
                    prompt: (
                        <span>
                            当入射光波长 <MathKatexInline math="\\lambda" fallback="λ" /> 变长、光栅常数 <MathKatexInline math="d" fallback="d" /> 不变时，谱线位置会怎样变化？
                        </span>
                    ),
                    options: ['衍射角变小，谱线向中心收缩', '衍射角变大，谱线向外侧偏移', '仅亮度变化，角度不变', '不同级次全部重合到同一角度'],
                    correctOptionIndex: 1,
                    successTip: (
                        <span>
                            正确：波长 <MathKatexInline math="\lambda" fallback="λ" /> 增大时，
                            <MathKatexInline math="\theta" fallback="θ" /> 增大，谱线向外偏移。
                        </span>
                    ),
                    failTip: (
                        <span>
                            提示：在 <MathKatexInline math="d" fallback="d" /> 与 <MathKatexInline math="m" fallback="m" /> 固定时，
                            <MathKatexInline math="\theta" fallback="θ" /> 与 <MathKatexInline math="\lambda" fallback="λ" /> 同向变化；
                            可回忆长波红光比短波更靠外侧。
                        </span>
                    ),
                },
            ]}
            summaryItems={[
                '多缝干涉与单缝衍射包络共同作用，形成明亮而尖锐的离散谱线。',
                <span key="s2">光栅方程：<MathKatexInline math="d\\sin\\theta = m\\lambda" fallback="d·sinθ = mλ" />，决定各级主极大的角位置。</span>,
                <span key="s3">在光栅常数 <MathKatexInline math="d" fallback="d" /> 和级次 <MathKatexInline math="m" fallback="m" /> 固定时，波长 <MathKatexInline math="\\lambda" fallback="λ" /> 越长，衍射角 <MathKatexInline math="\\theta" fallback="θ" /> 越大，谱线越向外分开。</span>,
                <span key="s4">光栅越密（<MathKatexInline math="d" fallback="d" /> 越小）时，不同波长对应的角度差更明显，因此色散能力更强。</span>,
                '利用上述分离特性，光栅可将白光分解为连续光谱用于分析。',
            ]}
            applicationItems={[
                'CD/DVD 表面的微沟槽相当于反射光栅，不同波长反射到不同方向，形成彩色反光。',
                '手机光谱仪通过小型光栅把入射光分开，再由相机记录光谱强度分布并进行成分分析。',
                '天文光谱分析利用恒星/星云的谱线位置与强度，判断其化学组成、温度及运动状态。',
            ]}
        />
    );
}
