'use client';

import * as React from "react";
import BlurOnIcon from "@mui/icons-material/BlurOn";
import ChangeHistoryIcon from "@mui/icons-material/ChangeHistory";
import CloseIcon from "@mui/icons-material/Close";
import FlareIcon from "@mui/icons-material/Flare";
import LightModeIcon from "@mui/icons-material/LightMode";
import ScienceIcon from "@mui/icons-material/Science";
import VisibilityIcon from "@mui/icons-material/Visibility";
import WavesIcon from "@mui/icons-material/Waves";
import {
    Box,
    ButtonBase,
    Divider,
    Tab,
    Tabs,
    Typography,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

type NavItem = {
    href: string;
    label: string;
};

type NavGroup = {
    title: string;
    members: NavItem[];
};

type WorkspaceTab = {
    id: string;
    type: 'nav' | 'experiment';
    title: string;
    href?: string;
};

type NavLabelParts = {
    indexText: string;
    titleText: string;
};

type ExperimentTabLabelProps = {
    tab: WorkspaceTab;
    onClose: (tabId: string) => void;
    onDropReorder: (toId: string) => void;
    onDragStart: (tabId: string) => void;
};

const NAV_TAB_ID = 'nav-home';

const TAB_BAR_SX: SxProps<Theme> = {
    minHeight: 48,
    '& .MuiTab-root': {
        fontSize: 16,
        minHeight: 48,
        textTransform: 'none',
        alignItems: 'center',
    },
};

const WORKSPACE_PANEL_SX: SxProps<Theme> = {
    width: '100%',
    height: 'calc(100vh - 110px)',
    border: '1px solid',
    borderColor: 'divider',
    borderRadius: 1,
    backgroundColor: 'background.paper',
};

function splitNavLabel(label: string): NavLabelParts {
    const [indexText, ...rest] = label.trim().split(/\s+/);
    return {
        indexText: indexText ?? '',
        titleText: rest.join(' ') || label,
    };
}

function getNavIcon(href: string) {
    const iconSx = { fontSize: 18 };
    if (['double-slit', 'single-slit', 'grating-diffraction', 'wedge-interference', 'newton-rings'].includes(href)) {
        return <WavesIcon sx={iconSx} />;
    }
    if (['polarization', 'polarization-3d', 'brewster-angle'].includes(href)) {
        return <BlurOnIcon sx={iconSx} />;
    }
    if (['critical-angle', 'fiber-total-internal-reflection', 'bubble-total-internal-reflection'].includes(href)) {
        return <FlareIcon sx={iconSx} />;
    }
    if (['prism-dispersion', 'rainbow', 'lens-chromatic'].includes(href)) {
        return <ChangeHistoryIcon sx={iconSx} />;
    }
    if (['convex-lens', 'microscope', 'telescope-magnification'].includes(href)) {
        return <VisibilityIcon sx={iconSx} />;
    }
    if (['photoelectric', 'stopping-voltage', 'photo-current-intensity'].includes(href)) {
        return <ScienceIcon sx={iconSx} />;
    }
    return <LightModeIcon sx={iconSx} />;
}

function ExperimentTabLabel({ tab, onClose, onDropReorder, onDragStart }: ExperimentTabLabelProps) {
    return (
        <Box
            className="flex items-center"
            draggable={tab.type === 'experiment'}
            onDragStart={() => onDragStart(tab.id)}
            onDragOver={(event) => {
                if (tab.type !== 'experiment') return;
                event.preventDefault();
            }}
            onDrop={() => {
                if (tab.type !== 'experiment') return;
                onDropReorder(tab.id);
            }}
        >
            <span>{tab.title}</span>
            {tab.type === 'experiment' && (
                <Box
                    component="span"
                    sx={{
                        ml: 0.75,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        cursor: 'pointer',
                        '&:hover': {
                            backgroundColor: 'action.hover',
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
                        if (event.key === 'Enter' || event.key === ' ') {
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

const NAV_GROUPS: NavGroup[] = [
    {
        title: '波动与偏振',
        members: [
            { href: 'double-slit', label: '① 杨氏双缝干涉' },
            { href: 'single-slit', label: '② 单缝衍射' },
            { href: 'grating-diffraction', label: '③ 平面光栅衍射' },
            { href: 'polarization', label: '④ 偏振片・马吕斯定律' },
            { href: 'brewster-angle', label: '⑤ 布儒斯特角・反射偏振' },
            { href: 'polarization-3d', label: '⑥ 3D 眼镜偏振分离' },
        ],
    },
    {
        title: '折射与成像',
        members: [
            { href: 'critical-angle', label: '⑦ 全反射临界角' },
            { href: 'fiber-total-internal-reflection', label: '⑧ 光纤全反射' },
            { href: 'bubble-total-internal-reflection', label: '⑨ 水中气泡全反射' },
            { href: 'prism-dispersion', label: '⑩ 三棱镜色散' },
            { href: 'rainbow', label: '⑪ 彩虹水滴折射' },
            { href: 'lens-chromatic', label: '⑫ 透镜色差' },
            { href: 'convex-lens', label: '⑬ 凸透镜成像' },
            { href: 'microscope', label: '⑭ 显微镜成像' },
            { href: 'telescope-magnification', label: '⑮ 望远镜倍率' },
        ],
    },
    {
        title: '光电效应',
        members: [
            { href: 'photoelectric', label: '⑯ 光电效应・光电子动能' },
            { href: 'stopping-voltage', label: '⑰ 遏止电压' },
            { href: 'photo-current-intensity', label: '⑱ 光电流与光强' },
        ],
    },
    {
        title: '其他',
        members: [
            { href: 'wedge-interference', label: 'Ⓐ 劈尖干涉' },
            { href: 'newton-rings', label: 'Ⓑ 牛顿环' },
            { href: 'optical-doppler', label: 'Ⓒ 光的多普勒效应' },
            { href: 'beer-lambert', label: 'Ⓓ 光的吸收定律' },
            { href: 'fiber-loss', label: 'Ⓔ 光纤损耗・长距离通信' },
            { href: 'rayleigh-scattering', label: 'Ⓕ 瑞利散射' },
        ],
    },
];

export default function Page() {
    const [tabs, setTabs] = React.useState<WorkspaceTab[]>([
        { id: NAV_TAB_ID, type: 'nav', title: '仿真实验列表' },
    ]);
    const [activeTabId, setActiveTabId] = React.useState<string>(NAV_TAB_ID);
    const dragTabIdRef = React.useRef<string | null>(null);

    const openExperimentTab = React.useCallback((item: NavItem) => {
        setTabs((prev) => {
            const existed = prev.find((tab) => tab.type === 'experiment' && tab.href === item.href);
            if (existed) {
                setActiveTabId(existed.id);
                return prev;
            }
            const id = `exp-${item.href}`;
            setActiveTabId(id);
            return [...prev, { id, type: 'experiment', title: item.label, href: item.href }];
        });
    }, []);

    const closeTab = React.useCallback((tabId: string) => {
        setTabs((prev) => {
            const closeIndex = prev.findIndex((tab) => tab.id === tabId);
            if (closeIndex <= 0) return prev;
            const next = prev.filter((tab) => tab.id !== tabId);
            if (activeTabId === tabId) {
                const nextActive = next[Math.max(0, closeIndex - 1)]?.id ?? NAV_TAB_ID;
                setActiveTabId(nextActive);
            }
            return next;
        });
    }, [activeTabId]);

    const reorderExperimentTabs = React.useCallback((fromId: string, toId: string) => {
        if (fromId === toId || fromId === NAV_TAB_ID || toId === NAV_TAB_ID) return;
        setTabs((prev) => {
            const fromIndex = prev.findIndex((tab) => tab.id === fromId);
            const toIndex = prev.findIndex((tab) => tab.id === toId);
            if (fromIndex <= 0 || toIndex <= 0) return prev;
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
        reorderExperimentTabs(fromId, toId);
    }, [reorderExperimentTabs]);

    return (
        <Box className="min-h-screen w-full">
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
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
                {activeTab.type === 'nav' && (
                    <Box sx={{ ...WORKSPACE_PANEL_SX, overflow: 'hidden' }}>
                        <Box sx={{ height: '100%', overflowY: 'auto', pr: 1, py: 1 }}>
                            {NAV_GROUPS.map(({ title, members }, groupIdx) => (
                                <React.Fragment key={title}>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                        sx={{
                                            px: 2,
                                            pt: 1,
                                            pb: 1.25,
                                        }}
                                    >
                                        {title}
                                    </Typography>
                                    <Box
                                        sx={{
                                            display: 'grid',
                                            gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
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
                                                    onClick={() => openExperimentTab(item)}
                                                    sx={{
                                                        height: 96,
                                                        width: '100%',
                                                        border: '1px solid',
                                                        borderColor: 'divider',
                                                        borderRadius: 1.5,
                                                        px: 1.25,
                                                        py: 1.25,
                                                        alignItems: 'stretch',
                                                        justifyContent: 'stretch',
                                                        textAlign: 'left',
                                                        backgroundColor: 'background.paper',
                                                        transition: 'all 0.18s ease',
                                                        '&:hover': {
                                                            borderColor: 'primary.main',
                                                            backgroundColor: 'action.hover',
                                                            transform: 'translateY(-1px)',
                                                        },
                                                    }}
                                                >
                                                    <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                position: 'absolute',
                                                                left: -2,
                                                                top: 0,
                                                                minWidth: 28,
                                                                height: 24,
                                                                px: 0.75,
                                                                borderRadius: 1,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.5,
                                                                fontSize: 16,
                                                                fontWeight: 600,
                                                                color: 'primary.main',
                                                            }}
                                                        >
                                                            {navIcon}
                                                            {indexText}
                                                        </Box>

                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                position: 'absolute',
                                                                right: 0,
                                                                bottom: 0,
                                                                fontSize: 15,
                                                                fontWeight: 500,
                                                                color: 'text.primary',
                                                                lineHeight: 1.35,
                                                                maxWidth: '88%',
                                                                textAlign: 'right',
                                                            }}
                                                        >
                                                            {titleText}
                                                        </Typography>
                                                    </Box>
                                                </ButtonBase>
                                            );
                                        })}
                                    </Box>
                                    {groupIdx < NAV_GROUPS.length - 1 && <Divider sx={{ my: 1 }} />}
                                </React.Fragment>
                            ))}
                        </Box>
                    </Box>
                )}

                {tabs
                    .filter((tab) => tab.type === 'experiment')
                    .map((tab) => (
                        <Box key={tab.id} sx={{ display: activeTabId === tab.id ? 'block' : 'none' }}>
                            <Box
                                component="iframe"
                                src={`/${tab.href}`}
                                title={tab.title}
                                sx={WORKSPACE_PANEL_SX}
                            />
                        </Box>
                    ))}
            </Box>
        </Box>
    );
}
