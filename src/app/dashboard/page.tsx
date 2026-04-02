"use client";

import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    ButtonBase,
    Chip,
    CircularProgress,
    IconButton,
    Typography,
} from "@mui/material";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { ProfileDialog } from "@/components/profile-dialog";
import { NAV_GROUPS } from "@/lib/simulations-nav";
import {
    getRecentLessonVideos,
    removeRecentLessonVideo,
    type RecentLessonVideoItem,
    RECENT_LESSON_VIDEO_STORAGE_KEY,
} from "@/lib/lesson-video-history";
import {
    getRecentSimulationHrefs,
    RECENT_SIMULATION_HREFS_KEY,
    removeRecentSimulationHref,
} from "@/lib/simulation-history";
import { LESSONS_ROUTE, SIMULATIONS_ROUTE, buildSimulationUrl } from "@/lib/routes";

type RecentExperimentItem = {
    href: string;
    label: string;
};

type AuthUser = {
    id: number;
    username: string;
    email: string;
    nickname: string;
    avatar_url: string | null;
    role: "student" | "teacher" | "admin";
    status: "active" | "disabled";
};

type ApiResult<T> = {
    ok: boolean;
    data?: T;
    message?: string;
};

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
    const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!response.ok) {
        return {
            ok: false,
            message: body?.message ?? "请求失败，请稍后重试",
        };
    }
    return { ok: true, data: body as T };
}

function openNavFromDashboard() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "dashboard:open-nav" }, window.location.origin);
        return;
    }
    window.location.assign(SIMULATIONS_ROUTE);
}

function openLessonFromDashboard() {
    if (window.parent !== window) {
        window.parent.postMessage({ type: "dashboard:open-lesson" }, window.location.origin);
        return;
    }
    window.location.assign(LESSONS_ROUTE);
}

function openExperimentFromDashboard(item: RecentExperimentItem) {
    if (window.parent !== window) {
        window.parent.postMessage(
            { type: "simulation:open", href: item.href, label: item.label },
            window.location.origin
        );
        return;
    }
    window.location.assign(buildSimulationUrl(item.href));
}

function openLessonVideoFromDashboard(item: RecentLessonVideoItem) {
    if (window.parent !== window) {
        window.parent.postMessage(
            { type: "lesson:open", href: item.href, label: item.label },
            window.location.origin
        );
        return;
    }
    window.location.assign(item.href);
}

export default function DashboardPage() {
    const [isAuthBootstrapping, setIsAuthBootstrapping] = React.useState(true);
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [authSyncTick, setAuthSyncTick] = React.useState(0);
    const [profileDialogOpen, setProfileDialogOpen] = React.useState(false);

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
    const [recentLessonVideos, setRecentLessonVideos] = React.useState<RecentLessonVideoItem[]>([]);

    const removeRecentHref = React.useCallback((hrefToRemove: string) => {
        setRecentHrefList(removeRecentSimulationHref(hrefToRemove));
    }, []);

    const removeRecentLessonVideoCallback = React.useCallback((hrefToRemove: string) => {
        setRecentLessonVideos(removeRecentLessonVideo(hrefToRemove));
    }, []);

    React.useEffect(() => {
        let isMounted = true;
        (async () => {
            const response = await fetch("/api/auth/me", { cache: "no-store" }).catch(() => null);
            if (!isMounted) return;
            if (!response) {
                setUser(null);
                setIsAuthBootstrapping(false);
                return;
            }
            const result = await parseResponse<AuthUser>(response);
            setUser(result.ok ? (result.data ?? null) : null);
            setIsAuthBootstrapping(false);
        })();

        return () => {
            isMounted = false;
        };
    }, [authSyncTick]);


    const handleAuthIconClick = React.useCallback(async () => {
        if (!user) {
            if (window.parent !== window) {
                window.parent.postMessage({ type: "auth:open" }, window.location.origin);
                return;
            }
            window.location.assign("/");
            return;
        }

        await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
        setUser(null);
        if (window.parent !== window) {
            window.parent.postMessage({ type: "auth:changed" }, window.location.origin);
        }
    }, [user]);

    const handleProfileIconClick = React.useCallback(() => {
        if (!user) return;
        if (window.parent !== window) {
            window.parent.postMessage({ type: "profile:open" }, window.location.origin);
            return;
        }
        setProfileDialogOpen(true);
    }, [user]);


    React.useEffect(() => {
        const loadRecent = () => {
            setRecentHrefList(getRecentSimulationHrefs());
        };

        loadRecent();
        const onStorage = (event: StorageEvent) => {
            if (event.key !== RECENT_SIMULATION_HREFS_KEY) return;
            loadRecent();
        };

        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    React.useEffect(() => {
        const loadRecentVideos = () => {
            setRecentLessonVideos(getRecentLessonVideos());
        };

        loadRecentVideos();
        const onStorage = (event: StorageEvent) => {
            if (event.key !== RECENT_LESSON_VIDEO_STORAGE_KEY) return;
            loadRecentVideos();
        };

        window.addEventListener("storage", onStorage);
        return () => {
            window.removeEventListener("storage", onStorage);
        };
    }, []);

    React.useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            if (!event.data || typeof event.data !== "object") return;
            const payload = event.data as { type?: unknown };
            if (payload.type === "auth:changed") {
                setAuthSyncTick((prev) => prev + 1);
            }
        };

        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
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
                        <Avatar
                            src={user?.avatar_url ?? undefined}
                            sx={{ width: 52, height: 52, bgcolor: "primary.main", fontSize: 22 }}
                        >
                            {user?.nickname?.[0]?.toUpperCase() ?? "G"}
                        </Avatar>
                        <Box>
                            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
                                {user?.nickname ?? "游客"}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {user?.email ?? "未登录"}
                            </Typography>
                        </Box>
                        <Box sx={{ flex: 1 }} />
                        {isAuthBootstrapping ? (
                            <CircularProgress size={22} />
                        ) : (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                {user && (
                                    <IconButton
                                        color="primary"
                                        aria-label="编辑个人资料"
                                        onClick={handleProfileIconClick}
                                    >
                                        <ManageAccountsIcon />
                                    </IconButton>
                                )}
                                <IconButton
                                    color={user ? "error" : "primary"}
                                    aria-label={user ? "退出登录" : "打开登录"}
                                    onClick={handleAuthIconClick}
                                >
                                    {user ? <LogoutIcon /> : <LoginIcon />}
                                </IconButton>
                            </Box>
                        )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                        <Chip
                            size="small"
                            label={user ? "已登录" : "未登录"}
                            color={user ? "success" : "default"}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={user ? (user.role === "admin" ? "管理员" : user.role === "teacher" ? "教师" : "学生") : "游客"}
                            color="primary"
                            variant="outlined"
                        />
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
                    <Box
                        sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            mb: 1.25,
                        }}
                    >
                        <Typography variant="h6">最近查看的科普视频</Typography>
                        <Typography
                            onClick={openLessonFromDashboard}
                            variant="body2"
                            sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                color: "primary.main",
                                cursor: "pointer",
                                fontWeight: 500,
                                "&:hover": { textDecoration: "underline", backgroundColor: "action.hover" },
                            }}
                        >
                            打开科普视频列表
                        </Typography>
                    </Box>
                    {recentLessonVideos.length === 0 && (
                        <Typography variant="body2" color="text.secondary">
                            暂无最近查看的科普视频，先打开科普视频列表看看吧。
                        </Typography>
                    )}
                    {recentLessonVideos.map((item) => (
                        <Box
                            key={item.href}
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
                            }}
                        >
                            <ButtonBase
                                className="label"
                                onClick={() => openLessonVideoFromDashboard(item)}
                                sx={{
                                    textAlign: "left",
                                    justifyContent: "flex-start",
                                    flex: 1,
                                    px: 1,
                                    py: 0.5,
                                }}
                            >
                                <Typography variant="body2">{item.label}</Typography>
                            </ButtonBase>

                            <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
                                <Button
                                    size="small"
                                    color="error"
                                    variant="text"
                                    onClick={() => removeRecentLessonVideoCallback(item.href)}
                                >
                                    删除
                                </Button>
                            </Box>
                        </Box>
                    ))}
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
                        <Typography variant="body2" color="text.secondary">
                            暂无最近查看的仿真实验，先打开仿真实验列表看看吧。
                        </Typography>
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

            {!embedMode && (
                <ProfileDialog
                    open={profileDialogOpen && Boolean(user)}
                    user={user}
                    onClose={() => setProfileDialogOpen(false)}
                    onUpdated={(updatedUser) => {
                        setUser(updatedUser);
                    }}
                    onDeleted={() => {
                        setUser(null);
                        setProfileDialogOpen(false);
                    }}
                />
            )}
        </Box>
    );
}
