'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack, TextField} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={520} height={380}/>)},
);

const toRadian = (deg: number) => deg * Math.PI / 180;

export default function Page() {
    const [leftAngle, setLeftAngle] = React.useState<number>(45);
    const [rightAngle, setRightAngle] = React.useState<number>(135);
    const [incidentAngle, setIncidentAngle] = React.useState<number>(45);

    const leftIntensity = React.useMemo(() => {
        return Math.pow(Math.cos(toRadian(incidentAngle - leftAngle)), 2);
    }, [incidentAngle, leftAngle]);

    const rightIntensity = React.useMemo(() => {
        return Math.pow(Math.cos(toRadian(incidentAngle - rightAngle)), 2);
    }, [incidentAngle, rightAngle]);

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="左眼偏振角 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={180} value={leftAngle} step={1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setLeftAngle(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 90, label: "90"}, {value: 180, label: "180"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="右眼偏振角 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={180} value={rightAngle} step={1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setRightAngle(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 90, label: "90"}, {value: 180, label: "180"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射光偏振角 (°)" variant="outlined" className="w-44"/>
                            <Slider
                                min={0} max={180} value={incidentAngle} step={1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setIncidentAngle(typeof newValue === 'number' ? newValue : newValue[0])}
                                marks={[{value: 0, label: "0"}, {value: 90, label: "90"}, {value: 180, label: "180"}]}
                            />
                        </Stack>
                        <Divider/>
                        <Stack spacing={2} direction="row">
                            <Chip label="左眼光强 I 左" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={leftIntensity.toFixed(5)}/>
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="右眼光强 I 右" variant="outlined" className="w-44"/>
                            <TextField disabled hiddenLabel size="small" variant="standard" value={rightIntensity.toFixed(5)}/>
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div className="mx-8 my-2">
                        <Plot
                            config={{staticPlot: true}}
                            data={[
                                {
                                    type: "bar",
                                    x: ["左眼", "右眼"],
                                    y: [leftIntensity, rightIntensity],
                                    marker: {color: ["#2563eb", "#16a34a"]},
                                },
                            ]}
                            layout={{
                                width: 560,
                                height: 420,
                                margin: {t: 20, l: 64, r: 12, b: 50},
                                xaxis: {title: {text: "通道"}},
                                yaxis: {
                                    title: {text: "透射光强"},
                                    range: [0, 1.05],
                                    showline: true,
                                    linewidth: 2,
                                    ticks: "outside",
                                    tickwidth: 2,
                                },
                                annotations: [
                                    {
                                        x: "左眼",
                                        y: leftIntensity,
                                        text: leftIntensity.toFixed(3),
                                        showarrow: false,
                                        yshift: 14,
                                    },
                                    {
                                        x: "右眼",
                                        y: rightIntensity,
                                        text: rightIntensity.toFixed(3),
                                        showarrow: false,
                                        yshift: 14,
                                    },
                                ],
                                showlegend: false,
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
