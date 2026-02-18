'use client';

import * as React from "react";
import {Card, CardContent, Link, MenuItem, MenuList, Typography} from "@mui/material";

export default function Page() {
    return (
        <div className="flex items-center justify-center h-screen">
            <Card>
                <CardContent className="flex flex-row">
                    <MenuList className="w-72">
                        <MenuItem>
                            <Link href="double-slit">
                                <Typography>Double-slit</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="single-slit">
                                <Typography>Single-slit</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="wedge">
                                <Typography>Wedge</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="newton">
                                <Typography>Newton&apos;s Ring</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="polarization">
                                <Typography>Polarization</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="brewster">
                                <Typography>Brewster</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="polarization-3d">
                                <Typography>3D Polarization Glasses</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="critical-angle">
                                <Typography>Critical Angle</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="fiber-tir">
                                <Typography>Fiber TIR</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="bubble-tir">
                                <Typography>Bubble TIR</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="prism-dispersion">
                                <Typography>Prism Dispersion</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="rainbow">
                                <Typography>Rainbow Formation</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="lens-chromatic">
                                <Typography>Lens Chromatic Aberration</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="convex-lens">
                                <Typography>Convex Lens Imaging</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="microscope">
                                <Typography>Microscope Imaging</Typography>
                            </Link>
                        </MenuItem>
                        <MenuItem>
                            <Link href="telescope-magnification">
                                <Typography>Telescope Magnification</Typography>
                            </Link>
                        </MenuItem>
                    </MenuList>
                </CardContent>
            </Card>
        </div>
    );
}
