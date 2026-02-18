'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Box, Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField, Typography} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={760} height={460}/>)},
);

type Vec = { x: number; y: number };

type RayTrace = {
    valid: boolean;
    p1: Vec;
    p2: Vec;
    p3: Vec;
    dIn: Vec;
    dOut: Vec;
    outAngle: number;
    elevation: number;
};

const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const sub = (a: Vec, b: Vec): Vec => ({x: a.x - b.x, y: a.y - b.y});
const scale = (a: Vec, s: number): Vec => ({x: a.x * s, y: a.y * s});
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;

const norm = (v: Vec): Vec => {
    const len = Math.hypot(v.x, v.y);
    if (len < 1e-9) return {x: 0, y: 0};
    return {x: v.x / len, y: v.y / len};
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const toDegree = (rad: number) => rad * 180 / Math.PI;

const wavelengthToRgb = (lambda: number) => {
    const wl = clamp(lambda, 380, 780);
    let r = 0;
    let g = 0;
    let b = 0;

    if (wl < 440) {
        r = -(wl - 440) / 60;
        b = 1;
    } else if (wl < 490) {
        g = (wl - 440) / 50;
        b = 1;
    } else if (wl < 510) {
        g = 1;
        b = -(wl - 510) / 20;
    } else if (wl < 580) {
        r = (wl - 510) / 70;
        g = 1;
    } else if (wl < 645) {
        r = 1;
        g = -(wl - 645) / 65;
    } else {
        r = 1;
    }

    let factor = 1;
    if (wl < 420) {
        factor = 0.3 + 0.7 * (wl - 380) / 40;
    } else if (wl > 700) {
        factor = 0.3 + 0.7 * (780 - wl) / 80;
    }

    const gamma = 0.8;
    const conv = (v: number) => Math.round(255 * Math.pow(Math.max(0, v * factor), gamma));
    return {r: conv(r), g: conv(g), b: conv(b)};
};

const wavelengthToColor = (lambda: number, alpha = 1) => {
    const {r, g, b} = wavelengthToRgb(lambda);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const refractiveIndex = (base: number, lambda: number) => {
    const k = 0.0024;
    const offset = k * ((1_000_000 / (lambda * lambda)) - (1_000_000 / (550 * 550)));
    return clamp(base + offset, 1.31, 1.36);
};

const refract = (incident: Vec, normal: Vec, nFrom: number, nTo: number): Vec | null => {
    const i = norm(incident);
    let n = norm(normal);
    let cosI = clamp(dot(i, n), -1, 1);
    let etaI = nFrom;
    let etaT = nTo;

    if (cosI > 0) {
        n = scale(n, -1);
        [etaI, etaT] = [etaT, etaI];
    } else {
        cosI = -cosI;
    }

    const eta = etaI / etaT;
    const k = 1 - eta * eta * (1 - cosI * cosI);
    if (k < 0) return null;
    return norm(add(scale(i, eta), scale(n, eta * cosI - Math.sqrt(k))));
};

const reflect = (incident: Vec, normal: Vec): Vec => {
    const i = norm(incident);
    const n = norm(normal);
    return norm(sub(i, scale(n, 2 * dot(i, n))));
};

const intersectCircle = (p: Vec, d: Vec): Vec | null => {
    const dir = norm(d);
    const b = 2 * dot(p, dir);
    const c = dot(p, p) - 1;
    const delta = b * b - 4 * c;
    if (delta < 0) return null;
    const s = Math.sqrt(delta);
    const t1 = (-b - s) / 2;
    const t2 = (-b + s) / 2;
    const t = [t1, t2].filter((v) => v > 1e-6).sort((a, b2) => a - b2)[0];
    if (!t) return null;
    return add(p, scale(dir, t));
};

const traceRainbowRay = (nWater: number, incidenceDeg: number): RayTrace => {
    const iRad = incidenceDeg * Math.PI / 180;
    const p1: Vec = {x: -Math.cos(iRad), y: Math.sin(iRad)};
    const dIn: Vec = {x: 1, y: 0};

    const n1 = norm(p1);
    const dInside1 = refract(dIn, n1, 1, nWater);
    if (!dInside1) {
        return {valid: false, p1, p2: p1, p3: p1, dIn, dOut: dIn, outAngle: 0, elevation: 0};
    }

    const p2 = intersectCircle(p1, dInside1);
    if (!p2) {
        return {valid: false, p1, p2: p1, p3: p1, dIn, dOut: dIn, outAngle: 0, elevation: 0};
    }

    const n2 = norm(p2);
    const dInside2 = reflect(dInside1, n2);

    const p3 = intersectCircle(p2, dInside2);
    if (!p3) {
        return {valid: false, p1, p2, p3: p2, dIn, dOut: dInside2, outAngle: 0, elevation: 0};
    }

    const n3 = norm(p3);
    const dOut = refract(dInside2, n3, nWater, 1);
    if (!dOut) {
        return {valid: false, p1, p2, p3, dIn, dOut: dInside2, outAngle: 0, elevation: 0};
    }

    const outAngle = toDegree(Math.atan2(dOut.y, dOut.x));
    const elevation = toDegree(Math.acos(clamp(-dot(norm(dIn), norm(dOut)), -1, 1)));

    return {valid: true, p1, p2, p3, dIn, dOut, outAngle, elevation};
};

export default function Page() {
    const [nWater, setNWater] = React.useState<number>(1.333);
    const [incidence, setIncidence] = React.useState<number>(59);

    const colorSet = React.useMemo(
        () => [
            {wl: 700},
            {wl: 620},
            {wl: 580},
            {wl: 530},
            {wl: 470},
            {wl: 420},
        ],
        [],
    );

    const fanWavelengths = React.useMemo(() => Array.from({length: 31}, (_, i) => 700 - i * 10), []);

    const colorAngles = React.useMemo(
        () => colorSet.map((c) => {
            const n = refractiveIndex(nWater, c.wl);
            const ray = traceRainbowRay(n, incidence);
            return {
                ...c,
                outAngle: ray.valid ? ray.outAngle : null,
                elevation: ray.valid ? ray.elevation : null,
                ray,
            };
        }),
        [colorSet, nWater, incidence],
    );

    const rainbowRange = React.useMemo(() => {
        const vals = colorAngles
            .map((c) => c.elevation)
            .filter((v): v is number => v !== null);
        if (vals.length === 0) return null;
        return {
            min: Math.min(...vals),
            max: Math.max(...vals),
        };
    }, [colorAngles]);

    const selectedRay = React.useMemo(() => {
        const n = refractiveIndex(nWater, 550);
        return traceRainbowRay(n, incidence);
    }, [nWater, incidence]);

    const spectrumRays = React.useMemo(
        () => fanWavelengths
            .map((wl) => {
                const n = refractiveIndex(nWater, wl);
                const ray = traceRainbowRay(n, incidence);
                if (!ray.valid) return null;
                const end = add(ray.p3, scale(ray.dOut, 1.8));
                return {
                    wl,
                    x: [ray.p3.x, end.x],
                    y: [ray.p3.y, end.y],
                    color: wavelengthToColor(wl, 0.9),
                };
            })
            .filter((v) => v !== null),
        [fanWavelengths, nWater, incidence],
    );

    const circleX = React.useMemo(() => Array.from({length: 361}, (_, i) => Math.cos(i * Math.PI / 180)), []);
    const circleY = React.useMemo(() => Array.from({length: 361}, (_, i) => Math.sin(i * Math.PI / 180)), []);

    const colorAngleRows = React.useMemo(() => {
        const items = colorAngles.map((c) => ({
            angleText: `${c.outAngle === null ? '--' : c.outAngle.toFixed(1)}°`,
            color: wavelengthToColor(c.wl, 1),
        }));

        const rows: Array<Array<{ angleText: string; color: string }>> = [];
        for (let i = 0; i < items.length; i += 2) {
            rows.push(items.slice(i, i + 2));
        }
        return rows;
    }, [colorAngles]);

    const rainbowElevationText = rainbowRange
        ? `${rainbowRange.min.toFixed(2)}° ~ ${rainbowRange.max.toFixed(2)}°`
        : '--';

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-[30rem] mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="水滴折射率 n" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.33} max={1.34} value={nWater} step={0.0001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setNWater(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1.33, label: '1.33'}, {value: 1.34, label: '1.34'}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射角度 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={40} max={70} value={incidence} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setIncidence(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 40, label: '40'}, {value: 70, label: '70'}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row" className="items-start">
                            <Chip label="各色光出射角" variant="outlined" className="w-44 mt-1"/>
                            <Box sx={{position: 'relative', flex: 1}}>
                                <TextField
                                    disabled
                                    multiline
                                    fullWidth
                                    minRows={3}
                                    hiddenLabel
                                    size="small"
                                    variant="standard"
                                    value={'\n\n'}
                                />
                                <Box sx={{position: 'absolute', left: 0, right: 0, top: 4, px: 0.5, pointerEvents: 'none'}}>
                                    {colorAngleRows.map((row, rowIndex) => (
                                        <Box key={rowIndex} sx={{display: 'flex', gap: 3, mb: rowIndex === colorAngleRows.length - 1 ? 0 : 0.5}}>
                                            {row.map((item, itemIndex) => (
                                                <Typography
                                                    key={`${rowIndex}-${itemIndex}`}
                                                    sx={{
                                                        fontSize: 14,
                                                        minWidth: 128,
                                                        color: 'text.primary',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 0.75,
                                                    }}
                                                >
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            width: 12,
                                                            height: 12,
                                                            border: '1px solid #111827',
                                                            backgroundColor: item.color,
                                                            borderRadius: '2px',
                                                            display: 'inline-block',
                                                            flexShrink: 0,
                                                        }}
                                                    />
                                                    {item.angleText}
                                                </Typography>
                                            ))}
                                        </Box>
                                    ))}
                                </Box>
                            </Box>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="彩虹仰角" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={rainbowElevationText}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: circleX,
                                    y: circleY,
                                    line: {color: '#0f172a', width: 2},
                                    name: '水滴边界',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: selectedRay.valid ? [selectedRay.p1.x - 1.4, selectedRay.p1.x] : [-2.4, -1],
                                    y: selectedRay.valid ? [selectedRay.p1.y, selectedRay.p1.y] : [0, 0],
                                    line: {color: '#e5e7eb', width: 4},
                                    name: '入射光',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: selectedRay.valid ? [selectedRay.p1.x, selectedRay.p2.x] : [0, 0],
                                    y: selectedRay.valid ? [selectedRay.p1.y, selectedRay.p2.y] : [0, 0],
                                    line: {color: '#60a5fa', width: 4},
                                    name: '第一次折射',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: selectedRay.valid ? [selectedRay.p2.x, selectedRay.p3.x] : [0, 0],
                                    y: selectedRay.valid ? [selectedRay.p2.y, selectedRay.p3.y] : [0, 0],
                                    line: {color: '#22c55e', width: 4},
                                    name: '内部反射',
                                },
                                ...spectrumRays.map((r) => ({
                                    type: 'scatter' as const,
                                    mode: 'lines' as const,
                                    x: r.x,
                                    y: r.y,
                                    line: {color: r.color, width: 2},
                                    showlegend: false,
                                })),
                            ]}
                            layout={{
                                width: 760,
                                height: 470,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                xaxis: {range: [-2.5, 2.9], visible: false, fixedrange: true},
                                yaxis: {range: [-1.8, 1.8], visible: false, fixedrange: true, scaleanchor: 'x', scaleratio: 1},
                                annotations: [
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.97,
                                        text: `水滴 n = ${nWater.toFixed(4)}`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.90,
                                        text: `入射角 = ${incidence.toFixed(1)}°`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper',
                                        yref: 'paper',
                                        x: 0.02,
                                        y: 0.83,
                                        text: `彩虹仰角 = ${rainbowElevationText}`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.75)',
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
