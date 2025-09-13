'use client';

import * as React from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, Chip, Divider, Slider, Stack } from "@mui/material";

const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });

export default function Page() {
    const [theta, setTheta] = React.useState(0);
    const [extinction, setExtinction] = React.useState(10);
    const [intensity, setIntensity] = React.useState(1);

    const actualIntensity = (t: number, i: number) => {
        const minI = i / extinction;
        return minI + (i - minI) * Math.pow(Math.cos(t * Math.PI / 180), 2);
    };

    const x1 = React.useMemo(() => Array.from({ length: 101 }, (_, i) => Math.PI * i / 50), []);
    const y1 = React.useMemo(() => x1.map(x => actualIntensity(theta, intensity) * Math.sin(x)), [x1, theta, intensity]);

    const polAxis = React.useMemo(() => {
        const r = 1;
        const angle = theta * Math.PI / 180;
        return { x: [0, r * Math.cos(angle)], y: [0, r * Math.sin(angle)] };
    }, [theta]);

    const x3 = React.useMemo(() => Array.from({ length: 181 }, (_, i) => i), []);
    const y3 = React.useMemo(() => x3.map(t => actualIntensity(t, intensity)), [x3, intensity, extinction]);
    const currentI = y3[theta];

    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <Stack spacing={4} direction="column" className="justify-center w-96 mr-6">
                        <Stack spacing={2} direction="row">
                            <Chip label="偏振片角度 θ (°)" variant="outlined" className="w-44" />
                            <Slider min={0} max={180} value={theta} step={1} valueLabelDisplay="auto"
                                onChange={(_e, v) => setTheta(typeof v === 'number' ? v : v[0])}
                                marks={[{ value: 0, label: '0' }, { value: 90, label: '90' }, { value: 180, label: '180' }]}
                            />
                            <Plot
                                config={{ staticPlot: true }}
                                data={[{
                                    x: polAxis.x, y: polAxis.y, type: 'scatter', mode: 'lines', line: { color: 'red', width: 4 }
                                }]}
                                layout={{
                                    width: 40, height: 32,
                                    margin: { t: 0, l: 8, r: 0, b: 0 },
                                    xaxis: { range: [-1.2, 1.2], visible: false },
                                    yaxis: { range: [-1.2, 1.2], visible: false },
                                    showlegend: false,
                                    shapes: [
                                        {
                                            type: 'circle',
                                            xref: 'x', yref: 'y',
                                            x0: -1, y0: -1, x1: 1, y1: 1,
                                            line: { color: 'gray' }
                                        }
                                    ]
                                }}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="消光比" variant="outlined" className="w-44" />
                            <Slider min={1} max={25} value={extinction} step={0.1} valueLabelDisplay="auto"
                                onChange={(_e, v) => setExtinction(typeof v === 'number' ? v : v[0])}
                                marks={[{ value: 1, label: '1' }, { value: 25, label: '25' }]}
                            />
                        </Stack>
                        <Stack spacing={2} direction="row">
                            <Chip label="入射光强" variant="outlined" className="w-44" />
                            <Slider min={0} max={1} value={intensity} step={0.01} valueLabelDisplay="auto"
                                onChange={(_e, v) => setIntensity(typeof v === 'number' ? v : v[0])}
                                marks={[{ value: 0, label: '0' }, { value: 1, label: '1' }]}
                            />
                        </Stack>
                    </Stack>
                    <Divider orientation="vertical" flexItem />
                    <div>
                        <Stack spacing={4} direction="column" className="mx-12 items-center">
                            <Plot
                                config={{ staticPlot: true }}
                                data={[{
                                    x: x1, y: y1, type: 'scatter', mode: 'lines', line: { color: 'blue' }
                                }]}
                                layout={{
                                    width: 400, height: 320, margin: { t: 20, l: 64, r: 0, b: 20 },
                                    xaxis: {
                                        showticklabels: false, showgrid: false,
                                        range: [0, Math.PI * 2], title: { text: '振幅' }
                                    },
                                    yaxis: { range: [-1.2, 1.2], title: { text: '时间' } }
                                }}
                            />
                            <Plot
                                config={{ staticPlot: true }}
                                data={[{
                                    x: x3, y: y3,
                                    type: 'scatter', mode: 'lines', line: { color: 'green' },
                                }, {
                                    x: [theta, theta], y: [-0.2, 1.2],
                                    type: 'scatter', mode: 'lines', line: { color: 'red', dash: 'dot' },
                                }, {
                                    x: [theta], y: [currentI], type: 'scatter', mode: 'markers',
                                    line: { color: 'red', width: 12 }
                                }]}
                                layout={{
                                    width: 400, height: 320, margin: { t: 20, l: 64, r: 0, b: 20 },
                                    xaxis: {
                                        showticklabels: false, showgrid: false,
                                        title: { text: '偏振片角度 θ' }, range: [0, 180]
                                    },
                                    yaxis: { range: [-0.2, 1.2], title: { text: '光强' } },
                                    showlegend: false,
                                    annotations: [{
                                        x: theta, y: currentI, text: `${(currentI * 100).toFixed(2)}%`,
                                        xanchor: 'right', yanchor: 'bottom'
                                    }]
                                }}
                            />
                        </Stack>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
