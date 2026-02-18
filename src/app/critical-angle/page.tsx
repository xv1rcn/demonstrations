'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={620} height={420}/>)},
);

const toDegree = (rad: number) => rad * 180 / Math.PI;

export default function Page() {
    const [n1, setN1] = React.useState<number>(1.5);
    const [n2, setN2] = React.useState<number>(1.0);

    const thetaIncident = 60;

    const thetaCritical = React.useMemo(() => {
        const ratio = Math.max(0, Math.min(1, n2 / n1));
        return toDegree(Math.asin(ratio));
    }, [n1, n2]);

    const isTotalInternalReflection = thetaIncident > thetaCritical;

    const rayLength = 1;
    const incidentX = -rayLength * Math.sin(thetaIncident * Math.PI / 180);
    const incidentY = -rayLength * Math.cos(thetaIncident * Math.PI / 180);
    const reflectX = rayLength * Math.sin(thetaIncident * Math.PI / 180);
    const reflectY = -rayLength * Math.cos(thetaIncident * Math.PI / 180);

    const transmitted = React.useMemo(() => {
        if (isTotalInternalReflection) {
            return {x: 0, y: 0, valid: false};
        }
        const sinThetaT = (n1 / n2) * Math.sin(thetaIncident * Math.PI / 180);
        const thetaT = Math.asin(Math.max(-1, Math.min(1, sinThetaT)));
        return {
            x: rayLength * Math.sin(thetaT),
            y: rayLength * Math.cos(thetaT),
            valid: true,
        };
    }, [isTotalInternalReflection, n1, n2]);

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="n1（光密）" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.1} max={2.0} value={n1} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => {
                                    const value = typeof newValue === 'number' ? newValue : newValue[0];
                                    setN1(value);
                                    setN2((prev) => Math.min(prev, value));
                                }}
                                marks={[{value: 1.1, label: "1.1"}, {value: 2.0, label: "2.0"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="n2（光疏）" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.0} max={n1} value={Math.min(n2, n1)} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => {
                                    const value = typeof newValue === 'number' ? newValue : newValue[0];
                                    setN2(Math.min(value, n1));
                                }}
                                marks={[{value: 1.0, label: "1.0"}, {value: n1, label: n1.toFixed(2)}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="临界角 θc (°)" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={thetaCritical.toFixed(3)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-8 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: "scatter", mode: "lines",
                                    x: [incidentX, 0], y: [incidentY, 0],
                                    line: {color: "#2563eb", width: 4},
                                    name: "入射光",
                                },
                                {
                                    type: "scatter", mode: "lines",
                                    x: [0, reflectX], y: [0, reflectY],
                                    line: {color: "#16a34a", width: 4},
                                    name: "反射光",
                                },
                                {
                                    type: "scatter", mode: "lines",
                                    x: [0, transmitted.x], y: [0, transmitted.y],
                                    line: {
                                        color: isTotalInternalReflection ? "#9ca3af" : "#dc2626",
                                        width: 4,
                                        dash: isTotalInternalReflection ? "dot" : "solid",
                                    },
                                    name: isTotalInternalReflection ? "无折射（全反射）" : "折射光",
                                },
                            ]}
                            layout={{
                                width: 700,
                                height: 460,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                xaxis: {range: [-1.1, 1.1], visible: false},
                                yaxis: {range: [-1.1, 1.1], visible: false, scaleanchor: "x", scaleratio: 1},
                                shapes: [
                                    {
                                        type: "line",
                                        x0: -1.1, x1: 1.1,
                                        y0: 0, y1: 0,
                                        line: {color: "#111827", width: 2},
                                    },
                                    {
                                        type: "line",
                                        x0: 0, x1: 0,
                                        y0: -1.1, y1: 1.1,
                                        line: {color: "#6b7280", width: 2, dash: "dot"},
                                    },
                                ],
                                annotations: [
                                    {
                                        x: -0.95, y: -0.95,
                                        text: `n1=${n1.toFixed(2)}（光密）`,
                                        showarrow: false,
                                    },
                                    {
                                        x: -0.95, y: 0.95,
                                        text: `n2=${n2.toFixed(2)}（光疏）`,
                                        showarrow: false,
                                    },
                                    {
                                        x: 0.62, y: 0.95,
                                        text: `θi=${thetaIncident.toFixed(1)}°`,
                                        showarrow: false,
                                        font: {color: "#2563eb"},
                                    },
                                    {
                                        x: 0.62, y: 0.82,
                                        text: isTotalInternalReflection ? "状态：全反射" : "状态：折射",
                                        showarrow: false,
                                        font: {color: isTotalInternalReflection ? "#dc2626" : "#16a34a"},
                                    },
                                ],
                                showlegend: true,
                                legend: {orientation: "h", x: 0.1, y: 1.08},
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
