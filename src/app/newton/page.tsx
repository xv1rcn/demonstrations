'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import * as d3 from "d3";
import {Card, CardContent, Chip, Divider, Skeleton, Slider, Stack} from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'),
    {ssr: false, loading: () => (<Skeleton width={180} height={400}/>)});

export default function Page() {
    const [lambda, setLambda] = React.useState<number>(480);
    const [r, setR] = React.useState<number>(8);

    const x = d3.range(-100, 100, 1);
    const y = React.useMemo(() => d3.range(-100, 100, 1), []);
    const [z, setZ] = React.useState<number[]>([]);
    const [w, setW] = React.useState<number[][]>([]);

    const calculateZ = React.useCallback(() => {
        return y.map(val => Math.pow(Math.sin(Math.PI * Math.pow(val, 2) / (r * lambda)), 2))
    }, [lambda, r, y]);

    React.useEffect(() => {
        const newZ = calculateZ();
        setZ(newZ);
    }, [calculateZ]);

    const calculateW = React.useCallback(() => {
        const tmpW: number[][] = [];
        for (const i of x) {
            const tmpWi: number[] = []
            for (const j of x) {
                const val = Math.sqrt(Math.pow(i, 2) + Math.pow(j, 2));
                tmpWi.push(Math.pow(Math.sin(Math.PI * Math.pow(val, 2) / (r * lambda)), 2));
            }
            tmpW.push(tmpWi);
        }
        return tmpW;
    }, [lambda, r, x]);

    React.useEffect(() => {
        const newW = calculateW();
        setW(newW);
    }, [calculateW]);

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="波长 (nm)" variant="outlined" className="w-44"/>
                            <Slider
                                max={780} min={380} defaultValue={480} step={0.1} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setLambda(newValue)}
                                marks={[{value: 380, label: "380"}, {value: 780, label: "780"}]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="曲率半径 (m)" variant="outlined" className="w-44"/>
                            <Slider
                                max={10} min={4} defaultValue={8} step={0.01} valueLabelDisplay="auto"
                                onChange={(_event, newValue) => setR(newValue)}
                                marks={[{value: 4, label: "4"}, {value: 10, label: "10"}]}
                            />
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem/>
                    <div>
                        <div className="flex space-x-4 mx-12 items-center">
                            <Plot
                                config={{staticPlot: true}}
                                data={[{type: "scatter", mode: "lines", x: z, y: y}]}
                                layout={{
                                    width: 160, height: 400, margin: {t: 0, l: 48, r: 0, b: 40},
                                    xaxis: {
                                        visible: true, showline: true, showticklabels: true,
                                        linewidth: 2, ticks: "outside", tickwidth: 2,
                                        minor: {showgrid: true, dtick: 0.05}
                                    },
                                    yaxis: {
                                        visible: true, showline: true, showticklabels: true,
                                        linewidth: 2, ticks: "outside", tickwidth: 2,
                                        minor: {showgrid: true, dtick: 100}
                                    },
                                    grid: {rows: 1, columns: 1, domain: {y: [0, 1]}}
                                }}
                            />
                            <Plot
                                config={{staticPlot: true}}
                                data={[{
                                    type: "heatmap", zmin: 0, zmax: 1, x: x, y: y, z: w,
                                    colorscale: [[0, "white"], [1, "black"]], showscale: false,
                                }]}
                                layout={{
                                    width: 360, height: 360, margin: {t: 0, l: 0, r: 0, b: 40},
                                    xaxis: {visible: false}, yaxis: {visible: false}
                                }}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
