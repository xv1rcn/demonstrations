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

const C = 3e8;
const SIGMA_MHZ = 10;

const wavelengthToRgb = (wavelengthNm: number) => {
    const w = Math.max(380, Math.min(780, wavelengthNm));
    let r = 0;
    let g = 0;
    let b = 0;

    if (w < 440) {
        r = -(w - 440) / (440 - 380);
        b = 1;
    } else if (w < 490) {
        g = (w - 440) / (490 - 440);
        b = 1;
    } else if (w < 510) {
        g = 1;
        b = -(w - 510) / (510 - 490);
    } else if (w < 580) {
        r = (w - 510) / (580 - 510);
        g = 1;
    } else if (w < 645) {
        r = 1;
        g = -(w - 645) / (645 - 580);
    } else {
        r = 1;
    }

    // Edge attenuation near visible range limits makes the color closer to perceived brightness.
    let factor = 1;
    if (w < 420) {
        factor = 0.3 + 0.7 * (w - 380) / (420 - 380);
    } else if (w > 700) {
        factor = 0.3 + 0.7 * (780 - w) / (780 - 700);
    }

    const toChannel = (v: number) => Math.round(255 * Math.pow(Math.max(0, v * factor), 0.8));
    return `rgb(${toChannel(r)}, ${toChannel(g)}, ${toChannel(b)})`;
};

export default function Page() {
    const [lengthM, setLengthM] = React.useState<number>(1);
    const [lambdaNm, setLambdaNm] = React.useState<number>(550);
    const [gainBwMhz, setGainBwMhz] = React.useState<number>(400);

    const hasError = lengthM <= 0 || lambdaNm <= 0 || gainBwMhz <= 0;

    const mOrder = React.useMemo(() => {
        if (hasError) return 0;
        return Math.round((2 * lengthM) / (lambdaNm * 1e-9));
    }, [hasError, lengthM, lambdaNm]);

    const deltaNuMhz = React.useMemo(() => {
        if (hasError) return 0;
        return (C / (2 * lengthM)) / 1e6;
    }, [hasError, lengthM]);

    const modeCount = React.useMemo(() => {
        if (hasError || deltaNuMhz <= 1e-9) return 0;
        return Math.max(1, Math.floor(gainBwMhz / deltaNuMhz) + 1);
    }, [hasError, gainBwMhz, deltaNuMhz]);

    const nu0Hz = C / (lambdaNm * 1e-9);
    const spectrumColor = React.useMemo(() => wavelengthToRgb(lambdaNm), [lambdaNm]);

    const freqOffset = React.useMemo(() => {
        const span = Math.max(gainBwMhz, deltaNuMhz * 4);
        return Array.from({ length: 1601 }, (_, i) => -span + (2 * span * i) / 1600);
    }, [gainBwMhz, deltaNuMhz]);

    const modalSpectrum = React.useMemo(() => {
        if (hasError) return freqOffset.map(() => 0);
        const startOffset = -((modeCount - 1) * deltaNuMhz) / 2;
        return freqOffset.map((f) => {
            let s = 0;
            for (let k = 0; k < modeCount; k += 1) {
                const center = startOffset + k * deltaNuMhz;
                s += Math.exp(-Math.pow(f - center, 2) / (2 * SIGMA_MHZ * SIGMA_MHZ));
            }
            return s;
        });
    }, [hasError, freqOffset, modeCount, deltaNuMhz]);

    const parameterItems: ParameterItem[] = [
        {
            key: 'lengthM',
            label: <span>谐振腔长度 <MathKatexInline math="L" fallback="L" /> (m)</span>,
            type: 'slider',
            value: lengthM,
            min: 0.1,
            max: 2,
            step: 0.01,
            onChange: setLengthM,
            valueLabelDisplay: 'auto',
            marks: [{ value: 0.1, label: '0.1' }, { value: 1, label: '1.0' }, { value: 2, label: '2.0' }],
        },
        {
            key: 'lambdaNm',
            label: <span>激光波长 <MathKatexInline math="\\lambda" fallback="λ" /> (nm)</span>,
            type: 'slider',
            value: lambdaNm,
            min: 400,
            max: 700,
            step: 0.1,
            onChange: setLambdaNm,
            valueLabelDisplay: 'auto',
            marks: [{ value: 400, label: '400' }, { value: 550, label: '550' }, { value: 632.8, label: '632.8' }, { value: 700, label: '700' }],
        },
        {
            key: 'gainBwMhz',
            label: <span>增益带宽 <MathKatexInline math="\\Delta\\nu_g" fallback="Δνg" /> (MHz)</span>,
            type: 'slider',
            value: gainBwMhz,
            min: 100,
            max: 1000,
            step: 1,
            onChange: setGainBwMhz,
            valueLabelDisplay: 'auto',
            marks: [{ value: 100, label: '100' }, { value: 500, label: '500' }, { value: 1000, label: '1000' }],
        },
    ];

    const controlsFooter = (
        <Stack spacing={1.5}>
            <Stack spacing={2} direction="row">
                <Chip label={<span>纵模序数 <MathKatexInline math="m" fallback="m" /></span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={mOrder.toString()} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label={<span>模间隔 <MathKatexInline math="\\Delta\\nu" fallback="Δν" /> (MHz)</span>} variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={deltaNuMhz.toFixed(3)} />
            </Stack>
            <Stack spacing={2} direction="row">
                <Chip label="可激发纵模数量" variant="outlined" className="w-56" />
                <TextField disabled hiddenLabel size="small" variant="standard" value={modeCount.toString()} />
            </Stack>
            {hasError && <Alert severity="error">谐振腔长度/波长/增益带宽必须为正。</Alert>}
        </Stack>
    );

    const traces: Data[] = [
        {
            type: 'scatter',
            mode: 'lines',
            x: freqOffset,
            y: modalSpectrum,
            line: { color: spectrumColor, width: 2.5 },
            name: '纵模谱线包络',
        },
    ];

    const visualization = (
        <Plot
            config={{ staticPlot: true }}
            data={traces}
            layout={{
                width: 860,
                height: 500,
                margin: { t: 34, l: 58, r: 24, b: 52 },
                xaxis: { title: { text: '频率偏移 Δf (MHz)' }, fixedrange: true },
                yaxis: { title: { text: '相对强度 I(ν)' }, fixedrange: true },
                annotations: [
                    {
                        xref: 'paper',
                        yref: 'paper',
                        x: 0.01,
                        y: 1.08,
                        text: `ν0=${(nu0Hz / 1e12).toFixed(3)}THz, Δν=${deltaNuMhz.toFixed(2)}MHz, N=${modeCount}`,
                        showarrow: false,
                        bgcolor: 'rgba(255,255,255,0.85)',
                        bordercolor: '#cbd5e1',
                        borderwidth: 1,
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
                { label: '短腔', onClick: () => { setLengthM(0.1); setLambdaNm(632.8); setGainBwMhz(400); } },
                { label: '标准腔', onClick: () => { setLengthM(0.3); setLambdaNm(632.8); setGainBwMhz(400); } },
                { label: '长腔', onClick: () => { setLengthM(0.5); setLambdaNm(632.8); setGainBwMhz(400); } },
            ]}
            hint={{
                title: '激光谐振腔纵模',
                content: (
                    <Stack spacing={1}>
                        <span>
                            光纤通信的单纵模激光器、激光笔的多纵模发光，都与激光谐振腔纵模有关。调节谐振腔腔长
                            <MathKatexInline math="L" fallback="L" />、激光波长
                            <MathKatexInline math="\\lambda" fallback="λ" />，可以看到纵模间隔的变化：腔长越长，纵模间隔越小；腔长越短，越容易实现单纵模（单色性更好），这是理解激光单色性的核心因素之一。
                        </span>
                    </Stack>
                ),
            }}
            simulationVisualization={visualization}
            questions={[
                {
                    id: 'laser-length-spacing-change',
                    type: 'single',
                    prompt: <span>激光谐振腔越长，纵模间隔会如何变化？</span>,
                    options: [
                        <span key="q1-o1">相邻纵模的频率间隔越大</span>,
                        <span key="q1-o2">相邻纵模的频率间隔越小</span>,
                        <span key="q1-o3">纵模间隔保持不变</span>,
                        <span key="q1-o4">先减小后增大</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：<MathKatexInline math="\\Delta\\nu=\\frac{c}{2L}" fallback="Δν=c/2L" />，腔长越长，纵模间隔越小。</span>,
                    failTip: <span>提示：激光谐振腔长度与纵模间隔成反比，腔长越长，间隔越小。</span>,
                },
                {
                    id: 'laser-resonance-condition',
                    type: 'single',
                    prompt: <span>纵模频率满足什么条件？</span>,
                    options: [
                        <span key="q2-o1">只要激光强度足够大就一定形成纵模</span>,
                        <span key="q2-o2">光在谐振腔内往返路程为光波长的整数倍（形成驻波共振）</span>,
                        <span key="q2-o3">腔内光程必须等于半个波长</span>,
                        <span key="q2-o4">纵模只由增益带宽决定，与腔长无关</span>,
                    ],
                    correctOptionIndex: 1,
                    successTip: <span>正确：纵模形成需满足驻波共振条件，常写为 <MathKatexInline math="2L=q\\lambda" fallback="2L=qλ" />。</span>,
                    failTip: <span>提示：纵模的形成需要满足驻波共振条件，光在腔内往返路程需符合特定规律。</span>,
                },
            ]}
            summaryItems={[
                '纵模是谐振腔内轴向驻波模式。',
                <span key="s2">共振条件：<MathKatexInline math="2L=q\lambda" fallback="2L=qλ" />。</span>,
                <span key="s3">纵模间隔：<MathKatexInline math="\Delta\nu=\frac{c}{2L}" fallback="Δν=c/2L" />。</span>,
                '腔长 L 越大，纵模间隔越小。',
                '单纵模对应更好的单色性；多纵模对应更宽的光谱。',
            ]}
            applicationItems={[
                '单纵模激光器在光纤通信中可通过模式控制提升频率稳定性并减轻色散影响。',
                '多纵模激光器结构相对简单且成本较低，但通常会表现出更宽的输出光谱。',
                '高精度光谱测量可利用窄线宽与稳定模结构提高频率分辨率和测量重复性。',
            ]}
        />
    );
}
