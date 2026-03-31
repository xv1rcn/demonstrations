"use client";

import * as React from "react";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import FlareIcon from "@mui/icons-material/Flare";
import LightModeIcon from "@mui/icons-material/LightMode";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WavesIcon from "@mui/icons-material/Waves";
import { Box, ButtonBase } from "@mui/material";
import { type Source } from "plyr";
import "plyr/dist/plyr.css";
import { openSimulation, type SimulationNavItem } from "@/lib/simulations-nav";
import { addRecentLessonVideo } from "@/lib/lesson-video-history";

export type LessonExperimentItem = SimulationNavItem;

export type LessonVideoMeta = {
    href: string;
    label: string;
    videoUrl: string;
};

export type LessonPageTemplateProps = {
    video: LessonVideoMeta;
    experiments: LessonExperimentItem[];
};

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
    if ([
        "double-slit",
        "single-slit",
        "grating-diffraction",
        "wedge-interference",
        "newton-rings",
    ].includes(href)) {
        return <WavesIcon sx={iconSx} />;
    }
    if (["polarization", "polarization-3d", "brewster-angle"].includes(href)) {
        return <BlurOnIcon sx={iconSx} />;
    }
    if (
        [
            "critical-angle",
            "fiber-total-internal-reflection",
            "bubble-total-internal-reflection",
        ].includes(href)
    ) {
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

const experimentButtonSx = {
    height: 110,
    width: "100%",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1.5,
    px: 2,
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
};

export default function LessonPageTemplate({ video, experiments }: LessonPageTemplateProps) {
    const playerRef = React.useRef<InstanceType<typeof import("plyr").default> | null>(null);
    const videoElRef = React.useRef<HTMLVideoElement | null>(null);
    const videoUrl = video.videoUrl;

    React.useEffect(() => {
        if (!videoElRef.current) return;
        let isMounted = true;

        const setupPlayer = async () => {
            try {
                playerRef.current?.destroy?.();
            } catch {
                // Swallow Plyr teardown errors.
            }

            const { default: PlyrCtor } = await import("plyr");
            if (!isMounted || !videoElRef.current) return;

            playerRef.current = new PlyrCtor(videoElRef.current, {
                controls: [
                    "play-large",
                    "play",
                    "progress",
                    "current-time",
                    "mute",
                    "volume",
                    "settings",
                    "fullscreen",
                ],
                seekTime: 5,
            });
        };

        setupPlayer();

        return () => {
            isMounted = false;
            try {
                playerRef.current?.destroy?.();
                playerRef.current = null;
            } catch {
                // Swallow Plyr teardown errors.
            }
        };
    }, []);

    React.useEffect(() => {
        if (!video.href || !video.label) return;
        addRecentLessonVideo({ href: video.href, label: video.label });
    }, [video.href, video.label]);

    React.useEffect(() => {
        const src = videoUrl;
        const activePlayer = playerRef.current;
        const sources: Source[] = [{ src, type: "video/mp4" }];
        if (activePlayer) {
            try {
                activePlayer.source = { type: "video", sources };
                const playResult = activePlayer.play?.();
                if (playResult && typeof playResult.catch === "function") {
                    playResult.catch(() => {});
                }
                return;
            } catch {
                // fall through to manual update
            }
        }
        if (videoElRef.current) {
            videoElRef.current.src = src;
            videoElRef.current.load();
            videoElRef.current.play().catch(() => {});
        }
    }, [videoUrl]);

    return (
        <Box
            className="min-h-screen w-full"
            sx={{
                px: { xs: 2, md: 3 },
                py: { xs: 2, md: 3 },
                backgroundColor: "background.default",
            }}
        >
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "minmax(0, 1fr) 240px" },
                    gap: { xs: 2, md: 3 },
                    alignItems: "stretch",
                }}
            >
                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        backgroundColor: "background.paper",
                        boxShadow: 2,
                        overflow: "hidden",
                        p: { xs: 1, md: 1.5 },
                    }}
                >
                    <Box
                        sx={{
                            width: "100%",
                            backgroundColor: "#000",
                        }}
                    >
                        <video
                            ref={videoElRef}
                            controls
                            playsInline
                            style={{ width: "100%", maxHeight: 640, backgroundColor: "#000" }}
                        >
                            <source src={videoUrl} type="video/mp4" />
                            您的浏览器不支持 video 标签。
                        </video>
                    </Box>
                </Box>

                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        backgroundColor: "background.paper",
                        boxShadow: 2,
                        p: { xs: 2, md: 2.5 },
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.25,
                    }}
                >
                    <Box sx={{ fontWeight: 600, fontSize: 16 }}>相关仿真实验</Box>
                    {experiments.map((item) => {
                        const { indexText, titleText } = splitNavLabel(item.label);
                        const navIcon = getNavIcon(item.href);
                        return (
                            <ButtonBase
                                key={item.href}
                                onClick={() => openSimulation(item)}
                                sx={experimentButtonSx}
                                aria-label={`打开 ${item.label}`}
                            >
                                <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
                                    <Box
                                        component="span"
                                        sx={{
                                            position: "absolute",
                                            left: -2,
                                            top: 0,
                                            minWidth: 30,
                                            height: 26,
                                            px: 1,
                                            borderRadius: 1,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            gap: 0.5,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: "primary.main",
                                        }}
                                    >
                                        {navIcon}
                                        {indexText}
                                    </Box>
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            right: 0,
                                            bottom: 0,
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: "text.primary",
                                            lineHeight: 1.4,
                                            maxWidth: "88%",
                                            textAlign: "right",
                                        }}
                                    >
                                        {titleText}
                                    </Box>
                                </Box>
                            </ButtonBase>
                        );
                    })}
                </Box>
            </Box>
        </Box>
    );
}
