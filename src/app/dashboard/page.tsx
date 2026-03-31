"use client";

import * as React from "react";
import { Avatar, Box, ButtonBase, Button, Chip, Typography } from "@mui/material";
import { NAV_GROUPS } from "@/lib/simulations-nav";

const RECENT_HREFS_KEY = "recent_simulation_hrefs";

type RecentExperimentItem = {
    href: string;
    label: string;
};

function openNavFromDashboard() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "dashboard:open-nav" }, window.location.origin);
        return;
    }
    window.location.assign("/");
}

function openLessonFromDashboard() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "dashboard:open-lesson" }, window.location.origin);
        return;
    }
    window.location.assign("/lesson");
}

function openExperimentFromDashboard(item: RecentExperimentItem) {
    if (window.parent !== window) {
        window.parent.postMessage(
            { type: "simulation:open", href: item.href, label: item.label },
            window.location.origin
        );
        return;
    }
    window.location.assign(`/simulations/${item.href}`);
}

export default function DashboardPage() {
    const [embedMode, setEmbedMode] = React.useState(false);
    React.useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            setEmbedMode(sp.get("embed") === "1");
        } catch {
            setEmbedMode(false);
        }
    }, []);

    const labelByHref = React.useMemo(() => {
        const allItems = NAV_GROUPS.flatMap((group) => group.members);
        return allItems.reduce<Record<string, string>>((acc, item) => {
            acc[item.href] = item.label;
            return acc;
        }, {});
    }, []);

    const [recentHrefList, setRecentHrefList] = React.useState<string[]>([]);

    const removeRecentHref = React.useCallback((hrefToRemove: string) => {
        try {
            const stored = window.localStorage.getItem(RECENT_HREFS_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored) as unknown;
            if (!Array.isArray(parsed)) return;
            const filtered = (parsed as string[]).filter((h) => h !== hrefToRemove);
            window.localStorage.setItem(RECENT_HREFS_KEY, JSON.stringify(filtered));
            setRecentHrefList(filtered.slice(0, 8));
        } catch {
            // ignore
        }
    }, []);

    

    React.useEffect(() => {
        const loadRecent = () => {
            const stored = window.localStorage.getItem(RECENT_HREFS_KEY);
            if (!stored) {
                setRecentHrefList([]);
                return;
            }
            try {
                const parsed = JSON.parse(stored) as unknown;
                if (!Array.isArray(parsed)) {
                    setRecentHrefList([]);
                    return;
                }
                const safe = parsed.filter((item): item is string => typeof item === "string");
                setRecentHrefList(safe.slice(0, 8));
            } catch {
                setRecentHrefList([]);
            }
        };

        loadRecent();
        const onStorage = (event: StorageEvent) => {
            if (event.key !== RECENT_HREFS_KEY) return;
            loadRecent();
        };

        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    return (
        <Box sx={{ width: "100%", height: "100%", p: embedMode ? 2.5 : 3 }}>
            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1.5,
                    mb: 2,
                    alignItems: "start",
                    "@media (max-width: 980px)": {
                        gridTemplateColumns: "1fr",
                    },
                }}
            >
                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        gap: 1.25,
                    }}
                >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                        <Avatar sx={{ width: 52, height: 52, bgcolor: "primary.main", fontSize: 22 }}>
                            D
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                                Demo User
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                demo.user@example.com
                            </Typography>
                        </Box>
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Chip size="small" label="已登录" color="success" variant="outlined" />
                        <Chip size="small" label="学生" color="primary" variant="outlined" />
                    </Box>
                    
                </Box>

                <Box
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1.5,
                        p: 2,
                    }}
                >
                    <Typography variant="subtitle2" color="text.secondary">
                        快速入口
                    </Typography>

                    <ButtonBase
                        onClick={openLessonFromDashboard}
                        sx={{
                            mt: 1,
                            width: "100%",
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            px: 1.5,
                            py: 1,
                            justifyContent: "flex-start",
                            "&:hover": { backgroundColor: "action.hover" },
                        }}
                    >
                        打开科普视频列表
                    </ButtonBase>
                </Box>

                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 1.25,
                        }}
                    >
                        <Typography variant="h6">最近查看的仿真实验</Typography>
                        <Typography
                            onClick={openNavFromDashboard}
                            variant="body2"
                            sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                color: "primary.main",
                                cursor: "pointer",
                                "&:hover": { textDecoration: "underline", backgroundColor: "action.hover" },
                                fontWeight: 500,
                            }}
                        >
                            打开仿真实验列表
                        </Typography>
                    </Box>
                    {recentHrefList.length === 0 && (
                        <Typography variant="body2" color="text.secondary">暂无历史记录，先去打开一个仿真实验。</Typography>
                    )}
                    {recentHrefList.map((href) => (
                        <Box
                            key={href}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                                mb: 0.5,
                                "&:hover .label": { textDecoration: "underline" },
                                backgroundColor: "transparent",
                            }}
                        >
                            <ButtonBase
                                className="label"
                                onClick={() => openExperimentFromDashboard({ href, label: labelByHref[href] ?? href })}
                                sx={{
                                    textAlign: "left",
                                    justifyContent: "flex-start",
                                    flex: 1,
                                    px: 1,
                                    py: 0.5,
                                }}
                            >
                                <Typography variant="body2">{labelByHref[href] ?? href}</Typography>
                            </ButtonBase>

                            <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={() => removeRecentHref(href)}
                                >
                                    删除
                                </Button>
                            </Box>
                        </Box>
                    ))}
                </Box>
            </Box>
            
        </Box>
    );
}
