'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={700} height={420}/>)},
);

const toDegree = (rad: number) => rad * 180 / Math.PI;
const toRadian = (deg: number) => deg * Math.PI / 180;

const guidedRayPath = (thetaCoreDeg: number, length: number, coreHeight: number) => {
    const xPoints: number[] = [0];
    const yPoints: number[] = [0];

    const slopeAbs = Math.tan(toRadian(thetaCoreDeg));
    if (slopeAbs < 1e-6) {
        xPoints.push(length);
        yPoints.push(0);
        return {x: xPoints, y: yPoints};
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

    return {x: xPoints, y: yPoints};
};

const leakedRayPath = (thetaCoreDeg: number, length: number, coreHeight: number, n1: number, n2: number) => {
    const slopeAbs = Math.tan(toRadian(thetaCoreDeg));
    const halfH = coreHeight / 2;

    if (slopeAbs < 1e-6) {
        return {
            inCore: {x: [0, length], y: [0, 0]},
            inCladding: {x: [] as number[], y: [] as number[]},
        };
    }

    const hitX = halfH / slopeAbs;
    if (hitX >= length) {
        return {
            inCore: {x: [0, length], y: [0, slopeAbs * length]},
            inCladding: {x: [] as number[], y: [] as number[]},
        };
    }

    const thetaIncidenceDeg = 90 - thetaCoreDeg;
    const sinThetaT = (n1 / n2) * Math.sin(toRadian(thetaIncidenceDeg));
    if (Math.abs(sinThetaT) > 1) {
        return {
            inCore: {x: [0, length], y: [0, slopeAbs * length]},
            inCladding: {x: [] as number[], y: [] as number[]},
        };
    }

    const thetaTdeg = toDegree(Math.asin(Math.max(-1, Math.min(1, sinThetaT))));
    const thetaCladdingFromAxisDeg = 90 - thetaTdeg;
    const claddingSlope = Math.tan(toRadian(thetaCladdingFromAxisDeg));
    return {
        inCore: {x: [0, hitX], y: [0, halfH]},
        inCladding: {x: [hitX, length], y: [halfH, halfH + (length - hitX) * claddingSlope]},
    };
};

export default function Page() {
    const [n1, setN1] = React.useState<number>(1.50);
    const [n2, setN2] = React.useState<number>(1.40);
    const [thetaIn, setThetaIn] = React.useState<number>(20);

    const na = React.useMemo(() => Math.sqrt(Math.max(0, n1 * n1 - n2 * n2)), [n1, n2]);
    const thetaCritical = React.useMemo(() => toDegree(Math.asin(Math.max(0, Math.min(1, n2 / n1)))), [n1, n2]);

    const thetaCore = React.useMemo(() => {
        const sinThetaCore = Math.sin(toRadian(thetaIn)) / n1;
        return toDegree(Math.asin(Math.max(-1, Math.min(1, sinThetaCore))));
    }, [thetaIn, n1]);

    const thetaIncidence = React.useMemo(() => 90 - thetaCore, [thetaCore]);
    const isTotalInternalReflection = React.useMemo(() => thetaIncidence > thetaCritical, [thetaIncidence, thetaCritical]);

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

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="纤芯 n1" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.44} max={1.55} value={n1} step={0.001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => {
                                    const value = typeof newValue === 'number' ? newValue : newValue[0];
                                    setN1(value);
                                    setN2((prev) => Math.min(prev, value));
                                }}
                                marks={[{value: 1.44, label: "1.44"}, {value: 1.55, label: "1.55"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="包层 n2" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.4} max={n1} value={Math.min(n2, n1)} step={0.001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => {
                                    const value = typeof newValue === 'number' ? newValue : newValue[0];
                                    setN2(Math.min(value, n1));
                                }}
                                marks={[{value: 1.4, label: "1.40"}, {value: n1, label: n1.toFixed(3)}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射端角度 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={30} value={thetaIn} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setThetaIn(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 30, label: "30"}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="临界角 θc (°)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={thetaCritical.toFixed(3)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="是否全反射" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={isTotalInternalReflection ? "是" : "否"}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="数值孔径 NA" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={na.toFixed(5)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: isTotalInternalReflection ? guided.x : leaked.inCore.x,
                                    y: isTotalInternalReflection ? guided.y : leaked.inCore.y,
                                    line: {color: "#2563eb", width: 4},
                                    name: "纤芯内光路",
                                    showlegend: true,
                                },
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: hasLeakedPath ? leaked.inCladding.x : [0],
                                    y: hasLeakedPath ? leaked.inCladding.y : [0],
                                    line: {color: "#dc2626", width: 4, dash: "dash"},
                                    name: "泄漏光路",
                                    visible: hasLeakedPath ? true : "legendonly",
                                    showlegend: true,
                                },
                            ]}
                            layout={{
                                width: 740,
                                height: 440,
                                margin: {t: 20, l: 24, r: 24, b: 20},
                                xaxis: {range: [0, length], visible: false},
                                yaxis: {range: [-3.2, 3.2], visible: false, scaleanchor: "x", scaleratio: 1},
                                shapes: [
                                    {
                                        type: "rect",
                                        x0: 0,
                                        x1: length,
                                        y0: -coreHeight / 2,
                                        y1: coreHeight / 2,
                                        line: {color: "#111827", width: 2},
                                        fillcolor: "rgba(37,99,235,0.08)",
                                    },
                                    {
                                        type: "rect",
                                        x0: 0,
                                        x1: length,
                                        y0: coreHeight / 2,
                                        y1: 3,
                                        line: {color: "#9ca3af", width: 1},
                                        fillcolor: "rgba(107,114,128,0.08)",
                                    },
                                    {
                                        type: "rect",
                                        x0: 0,
                                        x1: length,
                                        y0: -3,
                                        y1: -coreHeight / 2,
                                        line: {color: "#9ca3af", width: 1},
                                        fillcolor: "rgba(107,114,128,0.08)",
                                    },
                                ],
                                annotations: [
                                    {
                                        x: 0.8,
                                        y: 0,
                                        text: `纤芯 n1=${n1.toFixed(3)}`,
                                        showarrow: false,
                                    },
                                    {
                                        x: 0.8,
                                        y: 2.6,
                                        text: `包层 n2=${n2.toFixed(3)}`,
                                        showarrow: false,
                                    },
                                    {
                                        x: 7.8,
                                        y: 2.6,
                                        text: isTotalInternalReflection ? "状态：反弹前进（全反射）" : "状态：不满足全反射",
                                        showarrow: false,
                                        font: {color: isTotalInternalReflection ? "#16a34a" : "#dc2626"},
                                    },
                                ],
                                showlegend: true,
                                legend: {orientation: "h", x: 0.05, y: 1.08},
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
