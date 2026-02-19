'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";
import type {Data} from 'plotly.js';

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={860} height={500}/>),
});

const toRad = (deg: number) => deg * Math.PI / 180;
const toDeg = (rad: number) => rad * 180 / Math.PI;

function wavelengthToRgb(wavelengthNm: number): string {
    const gamma = 0.8;
    let r = 0;
    let g = 0;
    let b = 0;

    if (wavelengthNm >= 380 && wavelengthNm < 440) {
        r = -(wavelengthNm - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wavelengthNm < 490) {
        r = 0;
        g = (wavelengthNm - 440) / (490 - 440);
        b = 1;
    } else if (wavelengthNm < 510) {
        r = 0;
        g = 1;
        b = -(wavelengthNm - 510) / (510 - 490);
    } else if (wavelengthNm < 580) {
        r = (wavelengthNm - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wavelengthNm < 645) {
        r = 1;
        g = -(wavelengthNm - 645) / (645 - 580);
        b = 0;
    } else if (wavelengthNm <= 780) {
        r = 1;
        g = 0;
        b = 0;
    }

    let factor = 0;
    if (wavelengthNm >= 380 && wavelengthNm < 420) {
        factor = 0.3 + 0.7 * (wavelengthNm - 380) / (420 - 380);
    } else if (wavelengthNm <= 700) {
        factor = 1;
    } else if (wavelengthNm <= 780) {
        factor = 0.3 + 0.7 * (780 - wavelengthNm) / (780 - 700);
    }

    const R = Math.round(255 * Math.pow(r * factor, gamma));
    const G = Math.round(255 * Math.pow(g * factor, gamma));
    const B = Math.round(255 * Math.pow(b * factor, gamma));
    return `rgb(${R},${G},${B})`;
}

export default function Page() {
    const [dUm, setDUm] = React.useState<number>(4);
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

    const orders = Array.from({length: 17}, (_, idx) => idx - 8);
    const validOrders = orders
        .map((m) => {
            const theta = calcTheta(m);
            return theta === null ? null : {m, theta};
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
            line: {color: '#111827', width: 2},
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
                line: {color: lineColor, width: 3},
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
            marker: {size: 8, color: '#334155'},
            text: ['入射方向'],
            textposition: 'bottom center',
            name: '入射角',
        },
    ];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[31rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="光栅常数 d (μm)" variant="outlined" className="w-56"/>
                            <Slider
                                min={1}
                                max={10}
                                value={dUm}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setDUm(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1, label: '1'}, {value: 10, label: '10'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="波长 λ (nm)" variant="outlined" className="w-56"/>
                            <Slider
                                min={400}
                                max={700}
                                value={lambdaNm}
                                step={1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setLambdaNm(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 400, label: '400'}, {value: 700, label: '700'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射角 (°)" variant="outlined" className="w-56"/>
                            <Slider
                                min={0}
                                max={20}
                                value={incidenceDeg}
                                step={0.1}
                                valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setIncidenceDeg(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: '0'}, {value: 20, label: '20'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="1级衍射角 θ1" variant="outlined" className="w-56"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={theta1Text}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="2级衍射角 θ2" variant="outlined" className="w-56"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={theta2Text}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="可见高级次?" variant="outlined" className="w-56"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={highOrderText}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={traces}
                            layout={{
                                width: 860,
                                height: 500,
                                margin: {t: 24, l: 54, r: 24, b: 52},
                                xaxis: {
                                    title: '衍射角 θ (°)',
                                    range: [-90, 90],
                                    fixedrange: true,
                                    zeroline: true,
                                },
                                yaxis: {
                                    title: '相对强度（示意）',
                                    range: [-0.25, 1.05],
                                    fixedrange: true,
                                },
                                annotations: [
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.01,
                                        y: 0.98,
                                        text: `d·sinθ = mλ（含入射角修正） | d=${dUm.toFixed(2)}μm, λ=${lambdaNm.toFixed(0)}nm`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.82)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                ],
                                showlegend: true,
                                legend: {orientation: 'h', x: 0.02, y: 1.08},
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
