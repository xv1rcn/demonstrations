'use client';

import * as React from "react";
import CloseIcon from "@mui/icons-material/Close";
import { Box, Tab, Tabs } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import type { SimulationNavItem } from "@/lib/simulations-nav";
import {
    addRecentSimulationHref,
    getRecentSimulationHrefs,
    RECENT_SIMULATION_HREFS_KEY,
} from "@/lib/simulation-history";
import {
    buildEmbedUrl,
    buildSimulationUrl,
    DASHBOARD_ROUTE,
    LESSONS_ROUTE,
    SIMULATIONS_ROUTE,
} from "@/lib/routes";

type WorkspaceTab =
    | { id: string; type: "dashboard"; title: string }
    | { id: string; type: "nav"; title: string }
    | { id: string; type: "experiment"; title: string; href: string }
    | { id: string; type: "lesson"; title: string }
    | { id: string; type: "lessonVideo"; title: string; href: string };

type ExperimentTabLabelProps = {
    tab: WorkspaceTab;
    onClose: (tabId: string) => void;
    onDropReorder: (toId: string) => void;
    onDragStart: (tabId: string) => void;
};

const DASHBOARD_TAB_ID = "dashboard-home";
const NAV_TAB_ID = "nav-home";
const LESSON_TAB_ID = "lesson-home";
const TAB_BAR_SX: SxProps<Theme> = {
    minHeight: 48,
    "& .MuiTab-root": {
        fontSize: 16,
        minHeight: 48,
        textTransform: "none",
        alignItems: "center",
    },
};

const WORKSPACE_PANEL_SX: SxProps<Theme> = {
    width: "100%",
    height: "calc(100vh - 110px)",
    border: "1px solid",
    borderColor: "divider",
    borderRadius: 1,
    backgroundColor: "background.paper",
};

function buildLessonIframeSrc(href: string) {
    return buildEmbedUrl(href);
}

function ExperimentTabLabel({ tab, onClose, onDropReorder, onDragStart }: ExperimentTabLabelProps) {
    return (
        <Box
            className="flex items-center"
            draggable={tab.type !== "dashboard"}
            onDragStart={() => onDragStart(tab.id)}
            onDragOver={(event) => {
                if (tab.type === "dashboard") return;
                event.preventDefault();
            }}
            onDrop={() => {
                if (tab.type === "dashboard") return;
                onDropReorder(tab.id);
            }}
        >
            <span>{tab.title}</span>
            {tab.type !== "dashboard" && (
                <Box
                    component="span"
                    sx={{
                        ml: 0.75,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        cursor: "pointer",
                        "&:hover": {
                            backgroundColor: "action.hover",
                        },
                    }}
                    draggable={false}
                    role="button"
                    tabIndex={0}
                    onMouseDown={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                    }}
                    onClick={(event) => {
                        event.stopPropagation();
                        onClose(tab.id);
                    }}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            event.stopPropagation();
                            onClose(tab.id);
                        }
                    }}
                    aria-label={`关闭 ${tab.title}`}
                >
                    <CloseIcon sx={{ fontSize: 14 }} />
                </Box>
            )}
        </Box>
    );
}

type WorkspaceMessage =
    | { type: "simulation:open"; href: string; label: string }
    | { type: "lesson:open"; href: string; label: string }
    | { type: "dashboard:open-nav" }
    | { type: "dashboard:open-lesson" };

function parseWorkspaceMessage(data: unknown): WorkspaceMessage | null {
    if (!data || typeof data !== "object") return null;
    const payload = data as { type?: unknown; href?: unknown; label?: unknown };
    if (payload.type === "dashboard:open-nav") return { type: "dashboard:open-nav" };
    if (payload.type === "dashboard:open-lesson") return { type: "dashboard:open-lesson" };
    if (payload.type === "lesson:open") {
        if (typeof payload.href !== "string" || typeof payload.label !== "string") return null;
        return { type: "lesson:open", href: payload.href, label: payload.label };
    }
    if (payload.type !== "simulation:open") return null;
    if (typeof payload.href !== "string" || typeof payload.label !== "string") return null;
    return { type: "simulation:open", href: payload.href, label: payload.label };
}

export default function Page() {
    const [tabs, setTabs] = React.useState<WorkspaceTab[]>([
        { id: DASHBOARD_TAB_ID, type: "dashboard", title: "仪表盘" },
    ]);
    const [activeTabId, setActiveTabId] = React.useState<string>(DASHBOARD_TAB_ID);
    const dragTabIdRef = React.useRef<string | null>(null);
    const [, setRecentHrefList] = React.useState<string[]>([]);

    React.useEffect(() => {
        setRecentHrefList(getRecentSimulationHrefs());
    }, []);

    // Keep in sync when other windows (or an embedded iframe) update the recent list.
    React.useEffect(() => {
        const onStorage = (event: StorageEvent) => {
            if (event.key !== RECENT_SIMULATION_HREFS_KEY) return;
            setRecentHrefList(getRecentSimulationHrefs());
        };

        window.addEventListener("storage", onStorage);
        return () => window.removeEventListener("storage", onStorage);
    }, []);

    const openNavTab = React.useCallback(() => {
        setTabs((prev) => {
            const existed = prev.find((tab) => tab.type === "nav");
            if (existed) {
                setActiveTabId(existed.id);
                return prev;
            }
            setActiveTabId(NAV_TAB_ID);
            return [...prev, { id: NAV_TAB_ID, type: "nav", title: "仿真实验列表" }];
        });
    }, []);

    const openLessonTab = React.useCallback(() => {
        setTabs((prev) => {
            const existed = prev.find((tab) => tab.type === "lesson");
            if (existed) {
                setActiveTabId(existed.id);
                return prev;
            }
            setActiveTabId(LESSON_TAB_ID);
            return [...prev, { id: LESSON_TAB_ID, type: "lesson", title: "科普视频列表" }];
        });
    }, []);

    const openExperimentTab = React.useCallback((item: SimulationNavItem) => {
        setTabs((prev) => {
            const existed = prev.find((tab) => tab.type === "experiment" && tab.href === item.href);
            if (existed) {
                setActiveTabId(existed.id);
                return prev;
            }
            const id = `exp-${item.href}`;
            setActiveTabId(id);
            return [...prev, { id, type: "experiment", title: item.label, href: item.href }];
        });
        setRecentHrefList(addRecentSimulationHref(item.href));
    }, []);

    const openLessonVideoTab = React.useCallback((item: SimulationNavItem) => {
        setTabs((prev) => {
            const existed = prev.find((tab) => tab.type === "lessonVideo" && tab.href === item.href);
            if (existed) {
                setActiveTabId(existed.id);
                return prev;
            }
            const id = `lesson-video-${item.href}`;
            setActiveTabId(id);
            return [...prev, { id, type: "lessonVideo", title: item.label, href: item.href }];
        });
    }, []);

    React.useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin) return;
            const message = parseWorkspaceMessage(event.data);
            if (!message) return;
            if (message.type === "dashboard:open-nav") {
                openNavTab();
                return;
            }
            if (message.type === "dashboard:open-lesson") {
                openLessonTab();
                return;
            }
            if (message.type === "lesson:open") {
                openLessonVideoTab({ href: message.href, label: message.label });
                return;
            }
            openExperimentTab({ href: message.href, label: message.label });
        };

        window.addEventListener("message", onMessage);
        return () => {
            window.removeEventListener("message", onMessage);
        };
    }, [openExperimentTab, openLessonTab, openLessonVideoTab, openNavTab]);

    const closeTab = React.useCallback((tabId: string) => {
        setTabs((prev) => {
            const closeIndex = prev.findIndex((tab) => tab.id === tabId);
            if (closeIndex < 0) return prev;
            if (prev[closeIndex]?.type === "dashboard") return prev;
            const next = prev.filter((tab) => tab.id !== tabId);
            if (activeTabId === tabId) {
                const nextActive = next[Math.max(0, closeIndex - 1)]?.id ?? DASHBOARD_TAB_ID;
                setActiveTabId(nextActive);
            }
            return next;
        });
    }, [activeTabId]);

    const reorderDraggableTabs = React.useCallback((fromId: string, toId: string) => {
        if (fromId === toId) return;
        setTabs((prev) => {
            const fromIndex = prev.findIndex((tab) => tab.id === fromId);
            const toIndex = prev.findIndex((tab) => tab.id === toId);
            if (fromIndex < 0 || toIndex < 0) return prev;
            if (prev[fromIndex]?.type === "dashboard" || prev[toIndex]?.type === "dashboard") return prev;
            const next = [...prev];
            const [moving] = next.splice(fromIndex, 1);
            next.splice(toIndex, 0, moving);
            return next;
        });
    }, []);

    const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

    const handleDropReorder = React.useCallback((toId: string) => {
        const fromId = dragTabIdRef.current;
        if (!fromId) return;
        reorderDraggableTabs(fromId, toId);
    }, [reorderDraggableTabs]);

    return (
        <Box className="min-h-screen w-full">
            <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2, pt: 1 }}>
                <Tabs
                    value={activeTabId}
                    onChange={(_event, value) => setActiveTabId(value)}
                    variant="scrollable"
                    scrollButtons="auto"
                    aria-label="实验工作台标签栏"
                    sx={TAB_BAR_SX}
                >
                    {tabs.map((tab) => (
                        <Tab
                            key={tab.id}
                            value={tab.id}
                            label={(
                                <ExperimentTabLabel
                                    tab={tab}
                                    onClose={closeTab}
                                    onDropReorder={handleDropReorder}
                                    onDragStart={(tabId) => {
                                        dragTabIdRef.current = tabId;
                                    }}
                                />
                            )}
                        />
                    ))}
                </Tabs>
            </Box>

            <Box className="h-[calc(100vh-64px)] overflow-auto px-6 py-4">
                {activeTab.type === "dashboard" && (
                    <Box
                        component="iframe"
                        src={buildEmbedUrl(DASHBOARD_ROUTE)}
                        title="仪表盘"
                        sx={WORKSPACE_PANEL_SX}
                    />
                )}

                {activeTab.type === "nav" && (
                    <Box
                        component="iframe"
                        src={buildEmbedUrl(SIMULATIONS_ROUTE)}
                        title="仿真实验列表"
                        sx={WORKSPACE_PANEL_SX}
                    />
                )}

                {activeTab.type === "lesson" && (
                    <Box
                        component="iframe"
                        src={buildEmbedUrl(LESSONS_ROUTE)}
                        title="科普视频列表"
                        sx={WORKSPACE_PANEL_SX}
                    />
                )}

                {tabs
                    .filter((tab) => tab.type === "experiment")
                    .map((tab) => (
                        <Box key={tab.id} sx={{ display: activeTabId === tab.id ? "block" : "none" }}>
                                <Box
                                    component="iframe"
                                    src={buildSimulationUrl(tab.href)}
                                    title={tab.title}
                                    sx={WORKSPACE_PANEL_SX}
                                />
                        </Box>
                    ))}
                {tabs
                    .filter((tab) => tab.type === "lessonVideo")
                    .map((tab) => (
                        <Box key={tab.id} sx={{ display: activeTabId === tab.id ? "block" : "none" }}>
                            <Box
                                component="iframe"
                                src={tab.href ? buildLessonIframeSrc(tab.href) : ""}
                                title={tab.title}
                                sx={WORKSPACE_PANEL_SX}
                            />
                        </Box>
                    ))}
            </Box>
        </Box>
    );
}
