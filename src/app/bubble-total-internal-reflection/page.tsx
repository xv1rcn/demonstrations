'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={700} height={440}/>)},
);

const toRadian = (deg: number) => deg * Math.PI / 180;
const toDegree = (rad: number) => rad * 180 / Math.PI;

const normalize = (vector: [number, number]): [number, number] => {
    const len = Math.hypot(vector[0], vector[1]);
    if (len < 1e-9) return [0, 0];
    return [vector[0] / len, vector[1] / len];
};

export default function Page() {
    const [nWater, setNWater] = React.useState<number>(1.33);
    const [thetaIn, setThetaIn] = React.useState<number>(55);

    const thetaCritical = React.useMemo(() => {
        return toDegree(Math.asin(Math.max(0, Math.min(1, 1 / nWater))));
    }, [nWater]);
    const isTotalInternalReflection = thetaIn > thetaCritical;

    const centerX = 0;
    const centerY = 0;
    const radius = 1;
    const interfacePolar = 140;
    const px = centerX + radius * Math.cos(toRadian(interfacePolar));
    const py = centerY + radius * Math.sin(toRadian(interfacePolar));
    const point: [number, number] = [px, py];

    const normalToAir = normalize([centerX - point[0], centerY - point[1]]);
    const tangent = normalize([-normalToAir[1], normalToAir[0]]);

    const dInc = normalize([
        Math.cos(toRadian(thetaIn)) * normalToAir[0] + Math.sin(toRadian(thetaIn)) * tangent[0],
        Math.cos(toRadian(thetaIn)) * normalToAir[1] + Math.sin(toRadian(thetaIn)) * tangent[1],
    ]);

    const incidentLength = 2.2;
    const incidentStart: [number, number] = [
        point[0] - incidentLength * dInc[0],
        point[1] - incidentLength * dInc[1],
    ];

    const dRef = normalize([
        -Math.cos(toRadian(thetaIn)) * normalToAir[0] + Math.sin(toRadian(thetaIn)) * tangent[0],
        -Math.cos(toRadian(thetaIn)) * normalToAir[1] + Math.sin(toRadian(thetaIn)) * tangent[1],
    ]);
    const reflectedEnd: [number, number] = [
        point[0] + 1.8 * dRef[0],
        point[1] + 1.8 * dRef[1],
    ];

    const refractedEnd: [number, number] | null = (() => {
        const sinThetaT = nWater * Math.sin(toRadian(thetaIn));
        if (Math.abs(sinThetaT) > 1) return null;
        const thetaT = Math.asin(Math.max(-1, Math.min(1, sinThetaT)));
        const dTrans = normalize([
            Math.cos(thetaT) * normalToAir[0] + Math.sin(thetaT) * tangent[0],
            Math.cos(thetaT) * normalToAir[1] + Math.sin(thetaT) * tangent[1],
        ]);
        return [point[0] + 1.4 * dTrans[0], point[1] + 1.4 * dTrans[1]];
    })();

    const normalStart: [number, number] = [
        point[0] - 1.0 * normalToAir[0],
        point[1] - 1.0 * normalToAir[1],
    ];
    const normalEnd: [number, number] = [
        point[0] + 1.0 * normalToAir[0],
        point[1] + 1.0 * normalToAir[1],
    ];

    const circleAngles = React.useMemo(() => Array.from({length: 361}, (_, i) => i), []);
    const bubbleX = React.useMemo(
        () => circleAngles.map((deg) => centerX + radius * Math.cos(toRadian(deg))),
        [circleAngles],
    );
    const bubbleY = React.useMemo(
        () => circleAngles.map((deg) => centerY + radius * Math.sin(toRadian(deg))),
        [circleAngles],
    );

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="水折射率 n" variant="outlined" className="w-44"/>
                            <Slider
                                min={1.32} max={1.34} value={nWater} step={0.001} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setNWater(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 1.32, label: "1.32"}, {value: 1.34, label: "1.34"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射角度 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={90} value={thetaIn} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setThetaIn(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 90, label: "90"}]}
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
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-6 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: bubbleX,
                                    y: bubbleY,
                                    line: {color: "#111827", width: 2},
                                    name: "气泡边界",
                                },
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: [normalStart[0], normalEnd[0]],
                                    y: [normalStart[1], normalEnd[1]],
                                    line: {color: "#6b7280", width: 2, dash: "dot"},
                                    name: "法线",
                                },
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: [incidentStart[0], point[0]],
                                    y: [incidentStart[1], point[1]],
                                    line: {color: "#2563eb", width: 4},
                                    name: "入射光（水→气泡）",
                                },
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: [point[0], reflectedEnd[0]],
                                    y: [point[1], reflectedEnd[1]],
                                    line: {color: "#16a34a", width: 4},
                                    name: "反射光（水中）",
                                    visible: isTotalInternalReflection ? true : "legendonly",
                                },
                                {
                                    type: "scatter",
                                    mode: "lines",
                                    x: refractedEnd ? [point[0], refractedEnd[0]] : [point[0]],
                                    y: refractedEnd ? [point[1], refractedEnd[1]] : [point[1]],
                                    line: {color: "#dc2626", width: 4},
                                    name: "折射光（入气泡）",
                                    visible: isTotalInternalReflection ? "legendonly" : true,
                                },
                            ]}
                            layout={{
                                width: 740,
                                height: 460,
                                margin: {t: 20, l: 20, r: 20, b: 20},
                                xaxis: {range: [-2.2, 2.2], visible: false},
                                yaxis: {range: [-1.8, 1.8], visible: false, scaleanchor: "x", scaleratio: 1},
                                annotations: [
                                    {
                                        x: -1.95,
                                        y: 1.55,
                                        text: `水 n=${nWater.toFixed(3)}`,
                                        showarrow: false,
                                    },
                                    {
                                        x: 0,
                                        y: 0,
                                        text: "空气 n≈1.00",
                                        showarrow: false,
                                    },
                                    {
                                        x: 1.45,
                                        y: 1.55,
                                        text: isTotalInternalReflection ? "状态：全反射（气泡像小镜子）" : "状态：发生折射",
                                        showarrow: false,
                                        font: {color: isTotalInternalReflection ? "#dc2626" : "#16a34a"},
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
