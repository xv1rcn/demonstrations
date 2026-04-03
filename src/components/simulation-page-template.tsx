'use client';

import * as React from 'react';
import {
    Box,
    Button,
    Collapse,
    Divider,
    IconButton,
    Stack,
    Tab,
    Tabs,
} from '@mui/material';
import { usePathname } from 'next/navigation';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { ParameterControls, type ParameterItem } from '@/components/parameter-controls';
import { SimulationTipBubble } from '@/components/simulation-tip-bubble';
import { SimulationKnowledgePanel } from '@/components/simulation-knowledge-panel';
import { SimulationHintDialog } from '@/components/simulation-hint-dialog';
import { CommentsPanel } from '@/components/comments-panel';
import type { KnowledgeQuestion, SimulationHint, SimulationPreset } from '@/components/simulation-types';

export type {
    SimulationPreset,
    SimulationHint,
    MultipleChoiceQuestion,
    SingleChoiceQuestion,
    FillBlankQuestion,
    KnowledgeQuestion,
} from '@/components/simulation-types';

type SimulationPageTemplateProps = {
    simulationParameters?: ParameterItem[];
    simulationControls?: React.ReactNode;
    simulationControlsFooter?: React.ReactNode;
    simulationVisualization: React.ReactNode;
    presets?: SimulationPreset[];
    hint?: SimulationHint;
    questions: KnowledgeQuestion[];
    summaryItems: React.ReactNode[];
    applicationItems: React.ReactNode[];
};

export function SimulationPageTemplate({
    simulationParameters = [],
    simulationControls,
    simulationControlsFooter,
    simulationVisualization,
    presets = [],
    hint,
    questions,
    summaryItems,
    applicationItems,
}: SimulationPageTemplateProps) {
    const pathname = usePathname();
    const fallbackPresetTip = '试着自由探索参数，看看会发生什么变化。';
    const [tab, setTab] = React.useState<'simulation' | 'knowledge' | 'comments'>('simulation');
    const [isHintOpen, setIsHintOpen] = React.useState(false);
    const [hasAutoOpenedHint, setHasAutoOpenedHint] = React.useState(false);
    const [isPresetTipExpanded, setIsPresetTipExpanded] = React.useState(false);
    const [presetTip, setPresetTip] = React.useState<React.ReactNode>(fallbackPresetTip);
    const [autoExpandedPresetIndexes, setAutoExpandedPresetIndexes] = React.useState<number[]>([]);
    const [autoExpandedParameterDirections, setAutoExpandedParameterDirections] = React.useState<string[]>([]);
    const [, setActivePresetIndex] = React.useState<number | null>(null);
    const [activePresetLabelText, setActivePresetLabelText] = React.useState<string>('无');
    const [isPresetSynced, setIsPresetSynced] = React.useState(false);
    const [presetSnapshotSignature, setPresetSnapshotSignature] = React.useState<string | null>(null);
    const [isWaitingSnapshot, setIsWaitingSnapshot] = React.useState(false);
    const parameterValuesRef = React.useRef<Record<string, number>>({});

    const parameterSignature = React.useMemo(
        () => JSON.stringify(simulationParameters.map((item) => ({ key: item.key, value: item.value }))),
        [simulationParameters],
    );

    React.useEffect(() => {
        if (!hint || hasAutoOpenedHint) return;
        setIsHintOpen(true);
        setHasAutoOpenedHint(true);
    }, [hint, hasAutoOpenedHint]);

    React.useEffect(() => {
        simulationParameters.forEach((item) => {
            if (parameterValuesRef.current[item.key] === undefined) {
                parameterValuesRef.current[item.key] = item.value;
            }
        });
    }, [simulationParameters]);

    const handlePresetClick = React.useCallback((preset: SimulationPreset, index: number) => {
        preset.onClick();
        setPresetTip(preset.tip ?? fallbackPresetTip);
        setActivePresetIndex(index);
        setIsPresetSynced(true);
        setPresetSnapshotSignature(null);
        setIsWaitingSnapshot(true);

        if (typeof preset.label === 'string') {
            setActivePresetLabelText(preset.label);
        } else {
            setActivePresetLabelText(`预设 ${index + 1}`);
        }

        if (!autoExpandedPresetIndexes.includes(index)) {
            setIsPresetTipExpanded(true);
            setAutoExpandedPresetIndexes((prev) => [...prev, index]);
        }
    }, [autoExpandedPresetIndexes]);

    const wrappedParameterItems = React.useMemo(() => {
        return simulationParameters.map((item) => {
            const originalOnChange = item.onChange;
            return {
                ...item,
                onChange: (nextValue: number) => {
                    const prevValue = parameterValuesRef.current[item.key] ?? item.value;
                    parameterValuesRef.current[item.key] = nextValue;

                    originalOnChange(nextValue);

                    if (nextValue === prevValue) {
                        return;
                    }

                    const direction = nextValue > prevValue ? 'up' : 'down';
                    const nextTip = direction === 'up' ? item.tipIncrease : item.tipDecrease;

                    setIsPresetSynced(false);
                    setActivePresetIndex(null);
                    setActivePresetLabelText('无');
                    setPresetTip(nextTip ?? fallbackPresetTip);

                    const directionKey = `${item.key}:${direction}`;
                    if (!autoExpandedParameterDirections.includes(directionKey)) {
                        setIsPresetTipExpanded(true);
                        setAutoExpandedParameterDirections((prev) => [...prev, directionKey]);
                    }
                },
            };
        });
    }, [simulationParameters, autoExpandedParameterDirections]);

    React.useEffect(() => {
        if (!isWaitingSnapshot) return;

        let raf1 = 0;
        let raf2 = 0;
        raf1 = window.requestAnimationFrame(() => {
            raf2 = window.requestAnimationFrame(() => {
                setPresetSnapshotSignature(parameterSignature);
                setIsWaitingSnapshot(false);
            });
        });

        return () => {
            window.cancelAnimationFrame(raf1);
            window.cancelAnimationFrame(raf2);
        };
    }, [isWaitingSnapshot, parameterSignature]);

    React.useEffect(() => {
        if (isWaitingSnapshot) return;
        if (!isPresetSynced || !presetSnapshotSignature) return;
        if (parameterSignature === presetSnapshotSignature) return;

        setIsPresetSynced(false);
        setActivePresetIndex(null);
        setActivePresetLabelText('无');
        setPresetTip(fallbackPresetTip);
    }, [isWaitingSnapshot, isPresetSynced, parameterSignature, presetSnapshotSignature]);

    const targetTitle = React.useMemo(() => {
        const key = pathname.split('/').filter(Boolean).pop() ?? 'simulation';
        return key.replace(/-/g, ' ');
    }, [pathname]);

    return (
        <Box className="min-h-screen h-full w-full flex flex-col">
            <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2, pt: 1 }}>
                <Tabs
                    value={tab}
                    onChange={(_event, value) => setTab(value)}
                    aria-label="仿真页面标签页"
                    sx={{
                        minHeight: 48,
                        '& .MuiTab-root': {
                            fontSize: 16,
                            minHeight: 48,
                            textTransform: 'none',
                        },
                    }}
                >
                    <Tab value="simulation" label="模拟仿真" />
                    <Tab value="knowledge" label="知识学习" />
                    <Tab value="comments" label="讨论区" />
                </Tabs>
            </Box>

            {tab === 'simulation' && (
                <Box className="flex-1 min-h-0 overflow-auto px-6 py-4">
                    <Box className="min-h-full flex items-center">
                        <Box className="flex flex-row w-full">
                            <Stack spacing={4} direction="column" className="justify-center w-[31rem] mr-6">
                                {(presets.length > 0 || hint) && (
                                    <Stack spacing={1.25}>
                                        <Stack spacing={1} direction="row" className="items-center justify-between">
                                            <Stack
                                                spacing={1}
                                                direction="row"
                                                useFlexGap
                                                className="flex-wrap"
                                            >
                                                {presets.map((preset, index) => (
                                                    <Button
                                                        key={`preset-${index}`}
                                                        size="small"
                                                        variant="outlined"
                                                        onClick={() => handlePresetClick(preset, index)}
                                                        sx={{ flexShrink: 0 }}
                                                    >
                                                        {preset.label}
                                                    </Button>
                                                ))}
                                            </Stack>
                                            {(presets.length > 0 || hint) && (
                                                <Stack spacing={0.5} direction="row" className="items-center">
                                                    {presets.length > 0 && (
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            aria-label={isPresetTipExpanded ? '收起预设提示' : '展开预设提示'}
                                                            onClick={() => setIsPresetTipExpanded((prev) => !prev)}
                                                        >
                                                            {isPresetTipExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                                                        </IconButton>
                                                    )}
                                                    {hint && (
                                                        <IconButton
                                                            size="small"
                                                            color="primary"
                                                            aria-label={hint.buttonAriaLabel ?? '查看实验提示'}
                                                            onClick={() => setIsHintOpen(true)}
                                                        >
                                                            <HelpOutlineIcon fontSize="small" />
                                                        </IconButton>
                                                    )}
                                                </Stack>
                                            )}
                                        </Stack>

                                        {presets.length > 0 && (
                                            <Collapse in={isPresetTipExpanded} timeout={220} unmountOnExit>
                                                <SimulationTipBubble
                                                    isPresetSynced={isPresetSynced}
                                                    activePresetLabelText={activePresetLabelText}
                                                    tip={presetTip}
                                                />
                                            </Collapse>
                                        )}
                                    </Stack>
                                )}
                                {simulationParameters.length > 0 && <ParameterControls items={wrappedParameterItems} />}
                                {simulationControlsFooter && (
                                    <Stack spacing={2}>
                                        {simulationParameters.length > 0 && <Divider />}
                                        {simulationControlsFooter}
                                    </Stack>
                                )}
                                {simulationControls}
                            </Stack>
                            <Divider orientation="vertical" flexItem />
                            <Box className="mx-6 my-2">{simulationVisualization}</Box>
                        </Box>
                    </Box>
                </Box>
            )}

            {tab === 'knowledge' && (
                <SimulationKnowledgePanel
                    questions={questions}
                    summaryItems={summaryItems}
                    applicationItems={applicationItems}
                />
            )}

            {tab === 'comments' && (
                <Box className="flex-1 min-h-0 overflow-auto px-6 py-4">
                    <CommentsPanel targetType="simulation" targetTitle={targetTitle} />
                </Box>
            )}

            {hint && (
                <SimulationHintDialog
                    hint={hint}
                    isOpen={isHintOpen}
                    onClose={() => setIsHintOpen(false)}
                />
            )}
        </Box>
    );
}
