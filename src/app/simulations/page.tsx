"use client";

import * as React from "react";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import FlareIcon from "@mui/icons-material/Flare";
import LightModeIcon from "@mui/icons-material/LightMode";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WavesIcon from "@mui/icons-material/Waves";
import { Box, ButtonBase, Divider, Typography } from "@mui/material";
import { useSearchParams } from "next/navigation";
import { NAV_GROUPS, type SimulationNavItem } from "@/lib/simulations-nav";

type NavLabelParts = {
    indexText: string;
    titleText: string;
};

function splitNavLabel(label: string): NavLabelParts {
    const [indexText, ...rest] = label.trim().split(/\s+/);
    return {
        indexText: indexText ?? "",
        titleText: rest.join(" ") || label,
    };
}

function getNavIcon(href: string) {
    const iconSx = { fontSize: 18 };
    if (["double-slit", "single-slit", "grating-diffraction", "wedge-interference", "newton-rings"].includes(href)) {
        return <WavesIcon sx={iconSx} />;
    }
    if (["polarization", "polarization-3d", "brewster-angle"].includes(href)) {
        return <BlurOnIcon sx={iconSx} />;
    }
    if (["critical-angle", "fiber-total-internal-reflection", "bubble-total-internal-reflection"].includes(href)) {
        return <FlareIcon sx={iconSx} />;
    }
    if (["prism-dispersion", "rainbow", "lens-chromatic"].includes(href)) {
        return <ChangeHistoryIcon sx={iconSx} />;
    }
    if (["convex-lens", "microscope", "telescope-magnification"].includes(href)) {
        return <VisibilityIcon sx={iconSx} />;
    }
    if (["photoelectric", "stopping-voltage", "photo-current-intensity"].includes(href)) {
        return <ScienceIcon sx={iconSx} />;
    }
    return <LightModeIcon sx={iconSx} />;
}

function openExperiment(item: SimulationNavItem) {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "simulation:open", href: item.href, label: item.label }, window.location.origin);
        return;
    }
    window.location.assign(`/simulations/${item.href}`);
}

export default function SimulationsPage() {
    const searchParams = useSearchParams();
    const embedMode = searchParams.get("embed") === "1";

    const [expandedGroupTitles, setExpandedGroupTitles] = React.useState<string[]>(
        NAV_GROUPS.map((group) => group.title)
    );

    const toggleGroup = React.useCallback((title: string) => {
        setExpandedGroupTitles((prev) => {
            if (prev.includes(title)) {
                return prev.filter((item) => item !== title);
            }
            return [...prev, title];
        });
    }, []);

    return (
        <Box sx={{ width: "100%", height: "100%", px: embedMode ? 0 : 2, py: embedMode ? 0 : 2 }}>
            <Box sx={{ width: "100%", height: "100%", borderRadius: 1, overflow: "hidden" }}>
                <Box sx={{ height: "100%", overflowY: "auto", pr: 1, py: 1 }}>
                    {!embedMode && (
                        <Typography variant="h5" sx={{ px: 2, pb: 1.5, fontWeight: 700 }}>
                            仿真实验列表
                        </Typography>
                    )}
                    {NAV_GROUPS.map(({ title, members }, groupIdx) => (
                        <React.Fragment key={title}>
                            <ButtonBase
                                onClick={() => toggleGroup(title)}
                                sx={{
                                    width: "100%",
                                    justifyContent: "space-between",
                                    textAlign: "left",
                                    px: 2,
                                    pt: 1,
                                    pb: 1.25,
                                    borderRadius: 1,
                                    "&:hover": { backgroundColor: "action.hover" },
                                }}
                            >
                                <Typography variant="subtitle2" color="text.secondary">
                                    {title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {expandedGroupTitles.includes(title) ? "收起" : "展开"}
                                </Typography>
                            </ButtonBase>
                            {expandedGroupTitles.includes(title) && (
                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                                        gap: 1.5,
                                        px: 1.5,
                                        pb: 1,
                                    }}
                                >
                                    {members.map((item) => {
                                        const { indexText, titleText } = splitNavLabel(item.label);
                                        const navIcon = getNavIcon(item.href);
                                        return (
                                            <ButtonBase
                                                key={item.href}
                                                onClick={() => openExperiment(item)}
                                                sx={{
                                                    height: 96,
                                                    width: "100%",
                                                    border: "1px solid",
                                                    borderColor: "divider",
                                                    borderRadius: 1.5,
                                                    px: 1.25,
                                                    py: 1.25,
                                                    alignItems: "stretch",
                                                    justifyContent: "stretch",
                                                    textAlign: "left",
                                                    backgroundColor: "background.paper",
                                                    transition: "all 0.18s ease",
                                                    "&:hover": {
                                                        borderColor: "primary.main",
                                                        backgroundColor: "action.hover",
                                                        transform: "translateY(-1px)",
                                                    },
                                                }}
                                            >
                                                <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
                                                    <Box
                                                        component="span"
                                                        sx={{
                                                            position: "absolute",
                                                            left: -2,
                                                            top: 0,
                                                            minWidth: 28,
                                                            height: 24,
                                                            px: 0.75,
                                                            borderRadius: 1,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            justifyContent: "center",
                                                            gap: 0.5,
                                                            fontSize: 16,
                                                            fontWeight: 600,
                                                            color: "primary.main",
                                                        }}
                                                    >
                                                        {navIcon}
                                                        {indexText}
                                                    </Box>

                                                    <Typography
                                                        variant="body2"
                                                        sx={{
                                                            position: "absolute",
                                                            right: 0,
                                                            bottom: 0,
                                                            fontSize: 15,
                                                            fontWeight: 500,
                                                            color: "text.primary",
                                                            lineHeight: 1.35,
                                                            maxWidth: "88%",
                                                            textAlign: "right",
                                                        }}
                                                    >
                                                        {titleText}
                                                    </Typography>
                                                </Box>
                                            </ButtonBase>
                                        );
                                    })}
                                </Box>
                            )}
                            {groupIdx < NAV_GROUPS.length - 1 && <Divider sx={{ my: 1 }} />}
                        </React.Fragment>
                    ))}
                </Box>
            </Box>
        </Box>
    );
}
