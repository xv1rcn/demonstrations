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

const toRad = (deg: number) => deg * Math.PI / 180;

export default function Page() {
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [thetaDeg, setThetaDeg] = React.useState<number>(5);
    const [n, setN] = React.useState<number>(1.5);

    const x = React.useMemo(() => Array.from({ length: 101 }, (_, i) => -0.5 + i * 0.01), []);
    const y = React.useMemo(() => Array.from({ length: 401 }, (_, i) => -4000 + i * 20), []);

    const profile = React.useMemo(() => {
        const tanTheta = Math.tan(toRad(thetaDeg));
        return y.map((val) => Math.pow(Math.cos(2 * Math.PI * n * val * tanTheta / lambdaNm), 2));
    }, [y, n, thetaDeg, lambdaNm]);

    const heatmap = React.useMemo(() => {
        return profile.map((v) => Array(x.length).fill(v));
    }, [profile, x.length]);

    const fringeSpacing = React.useMemo(() => {
        const tanTheta = Math.tan(toRad(thetaDeg));
        if (tanTheta < 1e-9) return Infinity;
        return lambdaNm / (2 * n * tanTheta);
    }, [lambdaNm, n, thetaDeg]);

    const spacingText = Number.isFinite(fringeSpacing) ? fringeSpacing.toFixed(3) : '∞';

    const parameterItems: ParameterItem[] = [
        {
            key: 'lambdaNm',
            label: <span>入射波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
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
            key: 'thetaDeg',
            label: <span>楔角 <MathKatexInline math="\\theta" fallback="θ" /> (°)</span>,
            type: 'slider',
            value: thetaDeg,
            min: 0,
            max: 30,
            step: 0.1,
            valueLabelDisplay: 'auto',
            onChange: setThetaDeg,
            marks: [{ value: 0, label: '0' }, { value: 5, label: '5' }, { value: 30, label: '30' }],
        },
        {
            key: 'n',
            label: <span>折射率 <MathKatexInline math="n" fallback="n" /></span>,
            type: 'slider',
            value: n,
            min: 1,
            max: 3,
            step: 0.01,
            valueLabelDisplay: 'auto',
            onChange: setN,
            marks: [{ value: 1, label: '1' }, { value: 1.5, label: '1.5' }, { value: 3, label: '3' }],
        },
    ];

    const controlsFooter = (
        <>
            <Stack spacing={2} direction="row">
                <Chip label={<span>条纹间距（示意）<MathKatexInline math="\\Delta y" fallback="Δy" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={spacingText} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>干涉相位系数 <MathKatexInline math="n\\tan\\theta" fallback="n·tanθ" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={(n * Math.tan(toRad(thetaDeg))).toFixed(4)} />
            </Stack>
        </>
    );

    const visualization = (
        <div className="flex h-full items-center justify-center space-x-4 mx-2">
            <Plot
                config={{ staticPlot: true }}
                data={[{ type: 'scatter', mode: 'lines', x: profile, y } as Data]}
                layout={{
                    width: 420,
                    height: 420,
                    margin: { t: 20, l: 56, r: 16, b: 40 },
                    xaxis: { title: { text: '相对强度 I' }, range: [0, 1], fixedrange: true },
                    yaxis: { title: { text: '位置 y (a.u.)' }, fixedrange: true },
                    annotations: [{
                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.98,
                        text: `I(y)=cos²(2πn y tanθ / λ)`, showarrow: false,
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
                    yaxis: { visible: false, fixedrange: true },
                }}
            />
        </div>
    );

    return (
        <SimulationPageTemplate
            simulationParameters={parameterItems}
            simulationControlsFooter={controlsFooter}
            presets={[
                { label: '标准', onClick: () => { setLambdaNm(550); setThetaDeg(5); setN(1.5); } },
                { label: '宽条纹', onClick: () => { setLambdaNm(700); setThetaDeg(2); setN(1.2); } },
                { label: '密条纹', onClick: () => { setLambdaNm(450); setThetaDeg(12); setN(2.0); } },
            ]}
            hint={{
                title: '劈尖干涉',
                content: (
                    <span>
                        两块玻璃夹出微小楔角时出现的平行明暗条纹、精密光学检验中的平面度判断，都是劈尖干涉的典型应用。调节入射波长
                        <MathKatexInline math="\lambda" fallback="λ" />、楔角
                        <MathKatexInline math="\theta" fallback="θ" />、介质折射率
                        <MathKatexInline math="n" fallback="n" />，能看到条纹疏密变化：楔角越大或折射率越高，条纹越密；波长越长，条纹越疏，直观理解薄膜厚度线性变化导致的干涉规律。
                    </span>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'wedge-theta-spacing',
                    type: 'single',
                    prompt: <span>在 <MathKatexInline math="\\lambda,n" fallback="λ,n" /> 固定时，增大楔角 <MathKatexInline math="\\theta" fallback="θ" /> 会使条纹间距如何变化？</span>,
                    options: ['条纹更宽，间距增大', '条纹更密，间距减小', '条纹消失', '只改变亮度不改间距'],
                    correctOptionIndex: 1,
                    successTip: <span>正确：由 <MathKatexInline math="\\Delta y\propto\\frac{\\lambda}{n\\tan\\theta}" fallback="Δy∝λ/(n·tanθ)" />，θ 增大使间距变小。</span>,
                    failTip: <span>提示：楔角越大，厚度变化率越快，单位长度内相位变化更快，条纹会更密。</span>,
                },
                {
                    id: 'wedge-n-effect',
                    type: 'single',
                    prompt: <span>在 <MathKatexInline math="\\lambda,\\theta" fallback="λ,θ" /> 固定时，提高折射率 <MathKatexInline math="n" fallback="n" /> 的主要效果是？</span>,
                    options: ['条纹间距增大', '条纹间距减小', '条纹方向旋转90°', '与 n 无关'],
                    correctOptionIndex: 1,
                    successTip: <span>正确：相位项与 <MathKatexInline math="n" fallback="n" /> 成正比，n 增大时相位累积更快，条纹更密。</span>,
                    failTip: <span>提示：折射率会放大光程差贡献，进而影响干涉级次分布速度。</span>,
                },
            ]}
            summaryItems={[
                <span key="s1">劈尖干涉来自薄膜厚度沿空间线性变化，形成近似平行条纹。</span>,
                <span key="s2">强度可写作 <MathKatexInline math="I(y)=\\cos^2\\!\left(\\frac{2\\pi n y\\tan\\theta}{\\lambda}\\right)" fallback="I(y)=cos²(2πn y tanθ/λ)" />。</span>,
                <span key="s3">条纹间距近似满足 <MathKatexInline math="\\Delta y\propto\\frac{\\lambda}{n\\tan\\theta}" fallback="Δy∝λ/(n·tanθ)" />。</span>,
                '楔角、折射率和波长共同决定条纹疏密，是薄膜厚度标定的重要依据。',
            ]}
            applicationItems={[
                '表面平整度检测：通过条纹直线度判断两平板间微小夹角与形貌误差。',
                '薄膜厚度评估：利用条纹级次与间距反推出厚度梯度信息。',
                '教学演示：直观说明光程差、相位差与干涉可见条纹之间的定量关系。',
            ]}
        />
    );
}
