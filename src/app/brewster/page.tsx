'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={500} height={400}/>)},
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
        return {Rs: 1, Rp: 1, tir: true};
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
    const [theta, setTheta] = React.useState<number>(56.3);
    const [n1, setN1] = React.useState<number>(1);
    const [n2, setN2] = React.useState<number>(1.5);

    const x = React.useMemo(() => Array.from({length: 901}, (_, i) => i * 0.1), []);
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
        return {x: x[minIdx], y: (yRs[minIdx] + yRp[minIdx]) / 2};
    }, [x, yRs, yRp]);

    const brewsterPoint = React.useMemo(() => {
        const y = reflectanceAt(brewsterDeg, n1, n2).Rp;
        return {x: brewsterDeg, y};
    }, [brewsterDeg, n1, n2]);

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="入射角 θ (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={90} value={theta} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setTheta(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 90, label: "90"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="介质 1 折射率 n₁" variant="outlined" className="w-44"/>
                            <Slider
                                min={1} max={1.6} value={n1} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setN1(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1, label: "1.0"}, {value: 1.6, label: "1.6"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="介质 2 折射率 n₂" variant="outlined" className="w-44"/>
                            <Slider
                                min={1} max={1.6} value={n2} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setN2(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1, label: "1.0"}, {value: 1.6, label: "1.6"}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="布儒斯特角 θ_B (°)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={brewsterDeg.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="当前 Rs" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={current.Rs.toFixed(5)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="当前 Rp" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={current.Rp.toFixed(5)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-8 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: "scatter", mode: "lines", x: x, y: yRs,
                                    name: "Rs (s 分量)", line: {color: "#2563eb", width: 3},
                                },
                                {
                                    type: "scatter", mode: "lines", x: x, y: yRp,
                                    name: "Rp (p 分量)", line: {color: "#16a34a", width: 3},
                                },
                                {
                                    type: "scatter", mode: "markers", x: [crossing.x], y: [crossing.y],
                                    name: "Rs=Rp 交点", marker: {size: 9, color: "#7c3aed"},
                                },
                                {
                                    type: "scatter", mode: "markers", x: [brewsterPoint.x], y: [brewsterPoint.y],
                                    name: "Rp 消光", marker: {size: 10, color: "#dc2626", symbol: "diamond"},
                                },
                                {
                                    type: "scatter", mode: "markers", x: [theta], y: [current.Rs],
                                    name: "当前 θ 与 Rs 交点", marker: {size: 10, color: "#2563eb", symbol: "circle"},
                                },
                                {
                                    type: "scatter", mode: "markers", x: [theta], y: [current.Rp],
                                    name: "当前 θ 与 Rp 交点", marker: {size: 10, color: "#16a34a", symbol: "circle"},
                                },
                            ]}
                            layout={{
                                width: 700, height: 460, margin: {t: 20, l: 64, r: 12, b: 54},
                                xaxis: {
                                    title: {text: "入射角 θ (°)"}, range: [0, 90],
                                    showline: true, linewidth: 2, ticks: "outside", tickwidth: 2,
                                },
                                yaxis: {
                                    title: {text: "反射率"}, range: [0, 1.02],
                                    showline: true, linewidth: 2, ticks: "outside", tickwidth: 2,
                                },
                                shapes: [
                                    {
                                        type: "line",
                                        x0: brewsterDeg, x1: brewsterDeg,
                                        y0: 0, y1: 1.02,
                                        line: {color: "#dc2626", width: 2, dash: "dot"},
                                    },
                                    {
                                        type: "line",
                                        x0: theta, x1: theta,
                                        y0: 0, y1: 1.02,
                                        line: {color: "#ea580c", width: 2, dash: "dash"},
                                    },
                                ],
                                annotations: [
                                    {
                                        x: brewsterDeg, y: 0.96,
                                        text: `θ_B=${brewsterDeg.toFixed(2)}°`,
                                        showarrow: false, font: {color: "#dc2626"},
                                    },
                                    {
                                        x: theta, y: 0.86,
                                        text: `θ=${theta.toFixed(1)}°`,
                                        showarrow: false, font: {color: "#ea580c"},
                                    },
                                ],
                                legend: {orientation: "h", x: 0, y: 1.14},
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
