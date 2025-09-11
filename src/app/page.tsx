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
                    </MenuList>
                </CardContent>
            </Card>
        </div>
    );
}
