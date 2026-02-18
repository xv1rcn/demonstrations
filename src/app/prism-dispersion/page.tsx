'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'), {
    ssr: false,
    loading: () => (<Skeleton width={760} height={460}/>),
});

const toRadian = (deg: number) => deg * Math.PI / 180;
const toDegree = (rad: number) => rad * 180 / Math.PI;

type Vec = { x: number; y: number };

type RayResult = {
    valid: boolean;
    pEntry: Vec;
    pExit: Vec;
    dIn: Vec;
    dInside: Vec;
    dOut: Vec;
    delta: number;
};

type SpectrumHit = {
    wl: number;
    hit: Vec;
    ray: RayResult;
};

type SegmentHit = {
    point: Vec;
    t: number;
};

const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const sub = (a: Vec, b: Vec): Vec => ({x: a.x - b.x, y: a.y - b.y});
const scale = (a: Vec, s: number): Vec => ({x: a.x * s, y: a.y * s});
const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
const cross2 = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
const norm = (a: Vec): Vec => {
    const l = Math.hypot(a.x, a.y);
    if (l < 1e-9) return {x: 0, y: 0};
    return {x: a.x / l, y: a.y / l};
};

const refractiveIndex = (lambdaNm: number) => {
    const lambdaUm = lambdaNm / 1000;
    return 1.5046 + 0.0042 / (lambdaUm * lambdaUm);
};

const wavelengthToColor = (lambda: number) => {
    const wl = Math.max(380, Math.min(780, lambda));

    let r = 0;
    let g = 0;
    let b = 0;

    if (wl >= 380 && wl < 440) {
        r = -(wl - 440) / (440 - 380);
        g = 0;
        b = 1;
    } else if (wl >= 440 && wl < 490) {
        r = 0;
        g = (wl - 440) / (490 - 440);
        b = 1;
    } else if (wl >= 490 && wl < 510) {
        r = 0;
        g = 1;
        b = -(wl - 510) / (510 - 490);
    } else if (wl >= 510 && wl < 580) {
        r = (wl - 510) / (580 - 510);
        g = 1;
        b = 0;
    } else if (wl >= 580 && wl < 645) {
        r = 1;
        g = -(wl - 645) / (645 - 580);
        b = 0;
    } else if (wl >= 645 && wl <= 780) {
        r = 1;
        g = 0;
        b = 0;
    }

    let factor = 0;
    if (wl >= 380 && wl < 420) {
        factor = 0.3 + 0.7 * (wl - 380) / (420 - 380);
    } else if (wl >= 420 && wl <= 700) {
        factor = 1;
    } else if (wl > 700 && wl <= 780) {
        factor = 0.3 + 0.7 * (780 - wl) / (780 - 700);
    }

    const gamma = 0.8;
    const to255 = (v: number) => Math.round(255 * Math.pow(Math.max(0, v * factor), gamma));

    return `rgb(${to255(r)}, ${to255(g)}, ${to255(b)})`;
};

const lineIntersection = (p: Vec, d: Vec, a: Vec, b: Vec): Vec | null => {
    const e = sub(b, a);
    const den = cross2(d, e);
    if (Math.abs(den) < 1e-10) return null;
    const ap = sub(a, p);
    const t = cross2(ap, e) / den;
    const u = cross2(ap, d) / den;
    if (t <= 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
    return add(p, scale(d, t));
};

const raySegmentIntersection = (p: Vec, d: Vec, a: Vec, b: Vec): SegmentHit | null => {
    const e = sub(b, a);
    const den = cross2(d, e);
    if (Math.abs(den) < 1e-10) return null;
    const ap = sub(a, p);
    const t = cross2(ap, e) / den;
    const u = cross2(ap, d) / den;
    if (t <= 1e-6 || u < -1e-6 || u > 1 + 1e-6) return null;
    return {point: add(p, scale(d, t)), t};
};

const orientNormalAgainstIncident = (incident: Vec, normal: Vec): Vec => {
    return dot(incident, normal) < 0 ? normal : scale(normal, -1);
};

const refract = (incident: Vec, normal: Vec, nFrom: number, nTo: number): Vec | null => {
    const i = norm(incident);
    const n = norm(normal);
    const eta = nFrom / nTo;
    const cosI = -dot(i, n);
    const k = 1 - eta * eta * (1 - cosI * cosI);
    if (k < 0) return null;
    return norm(add(scale(i, eta), scale(n, eta * cosI - Math.sqrt(k))));
};

const reflect = (incident: Vec, normal: Vec): Vec => {
    const i = norm(incident);
    const n = norm(normal);
    return norm(sub(i, scale(n, 2 * dot(i, n))));
};

const tracePrismRay = (
    incidenceDeg: number,
    lambdaNm: number,
    pEntry: Vec,
    leftFaceTop: Vec,
    leftFaceBottom: Vec,
    apexPoint: Vec,
): RayResult => {
    const nPrism = refractiveIndex(lambdaNm);

    const leftFace = sub(leftFaceBottom, leftFaceTop);
    const upperFace = sub(apexPoint, leftFaceTop);
    const lowerFace = sub(apexPoint, leftFaceBottom);

    const tangentLeft = norm(leftFace);
    const inwardLeftCandidate = norm({x: -tangentLeft.y, y: tangentLeft.x});

    const dIn = norm(add(
        scale(inwardLeftCandidate, Math.cos(toRadian(incidenceDeg))),
        scale(tangentLeft, -Math.sin(toRadian(incidenceDeg))),
    ));

    const inwardLeft = orientNormalAgainstIncident(dIn, inwardLeftCandidate);
    const dInside = refract(dIn, inwardLeft, 1, nPrism);
    if (!dInside) {
        return {valid: false, pEntry, pExit: pEntry, dIn, dInside: dIn, dOut: dIn, delta: 0};
    }

    const hitUpper = raySegmentIntersection(pEntry, dInside, leftFaceTop, apexPoint);
    const hitLower = raySegmentIntersection(pEntry, dInside, leftFaceBottom, apexPoint);

    const candidates = [hitUpper, hitLower].filter((item): item is SegmentHit => item !== null);
    if (candidates.length === 0) {
        return {valid: false, pEntry, pExit: pEntry, dIn, dInside, dOut: dInside, delta: 0};
    }

    const exitHit = candidates.reduce((best, cur) => (cur.t < best.t ? cur : best));
    const pExit = exitHit.point;

    const exitFace = hitUpper && Math.abs(exitHit.t - hitUpper.t) < 1e-9 ? upperFace : lowerFace;

    const tangentRight = norm(exitFace);
    const outwardRightCandidate = norm({x: -tangentRight.y, y: tangentRight.x});
    const outwardRight = orientNormalAgainstIncident(dInside, outwardRightCandidate);

    let dOut = refract(dInside, outwardRight, nPrism, 1);
    if (!dOut) {
        dOut = reflect(dInside, outwardRight);
    }

    const delta = Math.acos(Math.max(-1, Math.min(1, dot(norm(dIn), norm(dOut)))));

    return {
        valid: true,
        pEntry,
        pExit,
        dIn,
        dInside,
        dOut,
        delta: toDegree(delta),
    };
};

export default function Page() {
    const [apex, setApex] = React.useState<number>(45);
    const [lambda, setLambda] = React.useState<number>(550);
    const [incidence, setIncidence] = React.useState<number>(45);
    const [entryPos, setEntryPos] = React.useState<number>(0);

    const prismHeight = 2.8;
    const halfH = prismHeight / 2;
    const entryX = 2.4;
    const tipX = 4.6 + (apex - 45) * 0.016;

    const leftFaceTop = React.useMemo<Vec>(() => ({x: entryX, y: halfH}), [entryX, halfH]);
    const leftFaceBottom = React.useMemo<Vec>(() => ({x: entryX, y: -halfH}), [entryX, halfH]);
    const apexPoint = React.useMemo<Vec>(() => ({x: tipX, y: 0}), [tipX]);

    const pEntry = React.useMemo<Vec>(() => ({x: entryX, y: entryPos * halfH}), [entryX, entryPos, halfH]);

    const selected = React.useMemo(
        () => tracePrismRay(incidence, lambda, pEntry, leftFaceTop, leftFaceBottom, apexPoint),
        [incidence, lambda, pEntry, leftFaceTop, leftFaceBottom, apexPoint],
    );

    const continuousWavelengths = React.useMemo(() => Array.from({length: 301}, (_, i) => 400 + i), []);

    const detectorX = 6.05;

    const collectHit = React.useCallback((wl: number): SpectrumHit | null => {
        const ray = tracePrismRay(incidence, wl, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        if (!ray.valid || Math.abs(ray.dOut.x) < 1e-6) return null;
        const t = (detectorX - ray.pExit.x) / ray.dOut.x;
        if (t <= 0) return null;
        const hit = add(ray.pExit, scale(ray.dOut, t));
        return {wl, hit, ray};
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint, detectorX]);

    const spectrumBand = React.useMemo(
        () => continuousWavelengths.map(collectHit).filter((v): v is SpectrumHit => v !== null),
        [continuousWavelengths, collectHit],
    );

    const selectedHit = React.useMemo(() => collectHit(lambda), [collectHit, lambda]);

    const delta = selected.valid ? selected.delta : null;

    const delta400 = React.useMemo(() => {
        const ray = tracePrismRay(incidence, 400, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        return ray.valid ? ray.delta : null;
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint]);

    const delta700 = React.useMemo(() => {
        const ray = tracePrismRay(incidence, 700, pEntry, leftFaceTop, leftFaceBottom, apexPoint);
        return ray.valid ? ray.delta : null;
    }, [incidence, pEntry, leftFaceTop, leftFaceBottom, apexPoint]);

    const dispersion = delta400 !== null && delta700 !== null ? Math.abs(delta400 - delta700) : null;

    const viewXMin = -2.1;
    const viewXMax = 7.3;
    const viewYMin = -3.2;
    const viewYMax = 3.2;

    const prismX = [leftFaceTop.x, apexPoint.x, leftFaceBottom.x, leftFaceTop.x];
    const prismY = [leftFaceTop.y, apexPoint.y, leftFaceBottom.y, leftFaceTop.y];

    const spectrumTraces = spectrumBand.map((s) => ({
        type: 'scatter' as const,
        mode: 'lines' as const,
        x: [detectorX, detectorX + 0.3],
        y: [s.hit.y, s.hit.y],
        line: {color: wavelengthToColor(s.wl), width: 3.5},
        hovertemplate: `λ=${s.wl}nm<extra></extra>`,
        showlegend: false,
    }));

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="入射点位置" variant="outlined" className="w-44"/>
                            <Slider
                                min={-1} max={1} value={entryPos} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setEntryPos(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: -1, label: "下"}, {value: 0, label: "中"}, {value: 1, label: "上"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射角 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={70} value={incidence} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setIncidence(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 70, label: "70"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="顶角 A (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={30} max={60} value={apex} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setApex(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 30, label: "30"}, {value: 60, label: "60"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="波长 λ (nm)" variant="outlined" className="w-44"/>
                            <Slider
                                min={400} max={700} value={lambda} step={1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setLambda(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 400, label: "400"}, {value: 700, label: "700"}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="偏转角 δ (°)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={delta === null ? "--" : delta.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="色散程度 Δδ (°)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={dispersion === null ? "--" : dispersion.toFixed(3)}/>
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
                                    x: prismX,
                                    y: prismY,
                                    fill: 'toself',
                                    fillcolor: 'rgba(148,163,184,0.18)',
                                    line: {color: '#334155', width: 2},
                                    name: '三棱镜',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [pEntry.x - 2.2 * selected.dIn.x, pEntry.x],
                                    y: [pEntry.y - 2.2 * selected.dIn.y, pEntry.y],
                                    line: {color: '#e5e7eb', width: 4},
                                    name: '入射光',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: [pEntry.x, selected.pExit.x],
                                    y: [pEntry.y, selected.pExit.y],
                                    line: {color: '#60a5fa', width: 4},
                                    name: '棱镜内光路',
                                },
                                {
                                    type: 'scatter',
                                    mode: 'lines',
                                    x: selectedHit ? [selectedHit.ray.pExit.x, selectedHit.hit.x] : [selected.pExit.x],
                                    y: selectedHit ? [selectedHit.ray.pExit.y, selectedHit.hit.y] : [selected.pExit.y],
                                    line: {color: wavelengthToColor(lambda), width: 4},
                                    name: '当前 λ 光线',
                                },
                                ...spectrumTraces,
                            ]}
                            layout={{
                                width: 790,
                                height: 480,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                autosize: false,
                                xaxis: {
                                    range: [viewXMin, viewXMax],
                                    visible: false,
                                    fixedrange: true,
                                    constrain: 'domain',
                                },
                                yaxis: {
                                    range: [viewYMin, viewYMax],
                                    visible: false,
                                    fixedrange: true,
                                    scaleanchor: 'x',
                                    scaleratio: 1,
                                    constrain: 'domain',
                                },
                                shapes: [
                                    {
                                        type: 'line',
                                        x0: detectorX,
                                        x1: detectorX,
                                        y0: viewYMin,
                                        y1: viewYMax,
                                        line: {color: '#6b7280', width: 2, dash: 'dot'},
                                    },
                                ],
                                annotations: [
                                    {
                                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.97,
                                        text: `入射点 = ${(entryPos * 100).toFixed(0)}%`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.90,
                                        text: `入射角 i = ${incidence.toFixed(1)}°`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.83,
                                        text: `顶角 A = ${apex.toFixed(1)}°`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        xref: 'paper', yref: 'paper', x: 0.02, y: 0.76,
                                        text: `当前 λ = ${lambda}nm`,
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.72)',
                                        bordercolor: '#cbd5e1',
                                        borderwidth: 1,
                                    },
                                    {
                                        x: detectorX,
                                        y: viewYMax - 0.3,
                                        text: '光屏（色散条带）',
                                        showarrow: false,
                                        bgcolor: 'rgba(255,255,255,0.72)',
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
