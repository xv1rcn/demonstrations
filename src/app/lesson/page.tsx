"use client";

import * as React from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, ButtonBase, Typography } from "@mui/material";
import { useRouter } from "next/navigation";

const VIDEO_LIST = [
    {
        href: "/lesson/interference",
        label: "❶ 光的干涉和衍射",
    },
    {
        href: "/lesson/polarization",
        label: "❷ 光的偏振",
    },
    {
        href: "/lesson/critical-angle-measurement",
        label: "❸ 全反射角的测量",
    },
    {
        href: "/lesson/dispersion",
        label: "❹ 光的色散",
    },
];

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

function getVideoIcon() {
    return <VisibilityIcon sx={{ fontSize: 18 }} />;
}

export default function LessonPage() {
    const [embedMode, setEmbedMode] = React.useState(false);
    const router = useRouter();

    const handleVideoClick = React.useCallback(
        (item: { href: string; label: string }) => {
            if (typeof window !== "undefined" && window.parent !== window) {
                window.parent.postMessage(
                    { type: "lesson:open", href: item.href, label: item.label },
                    window.location.origin
                );
                return;
            }
            router.push(item.href);
        },
        [router]
    );

    React.useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            setEmbedMode(sp.get("embed") === "1");
        } catch {
            setEmbedMode(false);
        }
    }, []);

    return (
        <Box sx={{ width: "100%", height: "100%", px: embedMode ? 0 : 2, py: embedMode ? 0 : 2 }}>
            <Box sx={{ width: "100%", height: "100%", borderRadius: 1, overflow: "hidden" }}>
                <Box sx={{ height: "100%", overflowY: "auto", pr: 1, py: 1 }}>
                    {!embedMode && (
                        <Typography variant="h5" sx={{ px: 2, pb: 1.5, fontWeight: 700 }}>
                            科普视频列表
                        </Typography>
                    )}
                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                            gap: 1.5,
                            px: 1.5,
                            pb: 1,
                        }}
                    >
                        {VIDEO_LIST.map((item) => {
                            const { indexText, titleText } = splitNavLabel(item.label);
                            const navIcon = getVideoIcon();
                            return (
                                <ButtonBase
                                    key={item.href}
                                    onClick={() => handleVideoClick(item)}
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
                </Box>
            </Box>
        </Box>
    );
}

