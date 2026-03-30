import * as React from "react";
import {Chip, Slider, Stack, TextField} from "@mui/material";

export type ParameterType = "slider" | "input";

export interface ParameterItem {
    key: string;
    label: React.ReactNode;
    type: ParameterType;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    onChange: (value: number) => void;
    valueLabelDisplay?: "auto" | "on" | "off";
    marks?: { value: number; label: string }[];
    disabled?: boolean;
    tipIncrease?: React.ReactNode;
    tipDecrease?: React.ReactNode;
}

export interface ParameterControlsProps {
    items: ParameterItem[];
}

export function ParameterControls({items}: ParameterControlsProps) {
    return (
        <Stack spacing={2}>
            {items.map((item) => (
                <Stack spacing={2} direction="row" key={item.key}>
                    <Chip
                        label={item.label}
                        variant="outlined"
                        className="w-56"
                    />
                    {item.type === "slider" ? (
                        <Slider
                            min={item.min}
                            max={item.max}
                            value={item.value}
                            step={item.step}
                            valueLabelDisplay={item.valueLabelDisplay ?? "auto"}
                            onChange={(_e, v) => item.onChange(typeof v === "number" ? v : v[0])}
                            marks={item.marks}
                            disabled={item.disabled}
                        />
                    ) : (
                        <TextField
                            type="number"
                            size="small"
                            value={item.value}
                            onChange={e => item.onChange(Number(e.target.value))}
                            disabled={item.disabled}
                            variant="standard"
                            inputProps={{min: item.min, max: item.max, step: item.step}}
                        />
                    )}
                    {item.unit && <span>{item.unit}</span>}
                </Stack>
            ))}
        </Stack>
    );
}
