"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Avatar, Box, ButtonBase, Chip, LinearProgress, Typography } from "@mui/material";
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
    const searchParams = useSearchParams();
    const embedMode = searchParams.get("embed") === "1";

    const labelByHref = React.useMemo(() => {
        const allItems = NAV_GROUPS.flatMap((group) => group.members);
        return allItems.reduce<Record<string, string>>((acc, item) => {
            acc[item.href] = item.label;
            return acc;
        }, {});
    }, []);

    const [recentHrefList, setRecentHrefList] = React.useState<string[]>([]);

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
                    gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                    gap: 1.5,
                    mb: 2,
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
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        <Chip size="small" label="普通会员" color="primary" variant="outlined" />
                        <Chip size="small" label="已登录" color="success" variant="outlined" />
                    </Box>
                    <Box>
                        <Typography variant="caption" color="text.secondary">
                            资料完整度
                        </Typography>
                        <LinearProgress variant="determinate" value={62} sx={{ mt: 0.8, borderRadius: 999 }} />
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
                        最近打开实验数
                    </Typography>
                    <Typography variant="h4" sx={{ mt: 1 }}>{recentHrefList.length}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        最近 7 天活跃模拟学习记录
                    </Typography>
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
                        onClick={openNavFromDashboard}
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
                        打开仿真实验列表
                    </ButtonBase>
                </Box>
            </Box>

            <Box
                sx={{
                    display: "grid",
                    gridTemplateColumns: "minmax(320px, 2fr) minmax(260px, 1fr)",
                    gap: 1.5,
                    alignItems: "start",
                    "@media (max-width: 980px)": {
                        gridTemplateColumns: "1fr",
                    },
                }}
            >
                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1.25 }}>最近打开的实验</Typography>
                    {recentHrefList.length === 0 && (
                        <Typography variant="body2" color="text.secondary">暂无历史记录，先去打开一个仿真实验。</Typography>
                    )}
                    {recentHrefList.map((href) => (
                        <ButtonBase
                            key={href}
                            onClick={() => openExperimentFromDashboard({ href, label: labelByHref[href] ?? href })}
                            sx={{
                                display: "block",
                                width: "100%",
                                textAlign: "left",
                                borderRadius: 1,
                                px: 1,
                                py: 0.8,
                                "&:hover": { backgroundColor: "action.hover" },
                            }}
                        >
                            <Typography variant="body2">{labelByHref[href] ?? href}</Typography>
                        </ButtonBase>
                    ))}
                </Box>

                <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1.25 }}>学习概览</Typography>
                    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">完成实验</Typography>
                        <Typography variant="body2" fontWeight={600}>8</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">本周学习时长</Typography>
                        <Typography variant="body2" fontWeight={600}>3.6 小时</Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.5 }}>
                        <Typography variant="body2" color="text.secondary">收藏实验</Typography>
                        <Typography variant="body2" fontWeight={600}>2</Typography>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
}
