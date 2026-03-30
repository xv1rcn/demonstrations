'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Chip,
    Collapse,
    Divider,
    FormControlLabel,
    IconButton,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';
import { ParameterControls, type ParameterItem } from '@/components/parameter-controls';

export type SimulationPreset = {
    label: React.ReactNode;
    onClick: () => void;
    tip?: React.ReactNode;
};

export type SimulationHint = {
    content: React.ReactNode;
    title?: React.ReactNode;
    buttonAriaLabel?: string;
};


export type MultipleChoiceQuestion = {
    id: string;
    type: 'multiple';
    prompt: React.ReactNode;
    options: React.ReactNode[];
    correctOptionIndexes: number[];
    successTip: React.ReactNode;
    failTip: React.ReactNode;
};

export type SingleChoiceQuestion = {
    id: string;
    type: 'single';
    prompt: React.ReactNode;
    options: React.ReactNode[];
    correctOptionIndex: number;
    successTip: React.ReactNode;
    failTip: React.ReactNode;
};

export type FillBlankQuestion = {
    id: string;
    type: 'fill';
    prompt: React.ReactNode;
    acceptedAnswers: string[];
    successTip: React.ReactNode;
    failTip: React.ReactNode;
    placeholder?: string;
};

export type KnowledgeQuestion = MultipleChoiceQuestion | SingleChoiceQuestion | FillBlankQuestion;

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

type QuestionResult = Record<string, boolean | null>;

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
    const fallbackPresetTip = '试着自由探索参数，看看会发生什么变化。';
    const [tab, setTab] = React.useState<'simulation' | 'knowledge'>('simulation');
    const [multiAnswers, setMultiAnswers] = React.useState<Record<string, number[]>>({});
    const [singleAnswers, setSingleAnswers] = React.useState<Record<string, number>>({});
    const [fillAnswers, setFillAnswers] = React.useState<Record<string, string>>({});
    const [results, setResults] = React.useState<QuestionResult>({});
    const [submitted, setSubmitted] = React.useState(false);
    const [isHintOpen, setIsHintOpen] = React.useState(false);
    const [hasAutoOpenedHint, setHasAutoOpenedHint] = React.useState(false);
    const [isPresetTipExpanded, setIsPresetTipExpanded] = React.useState(false);
    const [presetTip, setPresetTip] = React.useState<React.ReactNode>(fallbackPresetTip);
    const [autoExpandedPresetIndexes, setAutoExpandedPresetIndexes] = React.useState<number[]>([]);
    const [activePresetIndex, setActivePresetIndex] = React.useState<number | null>(null);
    const [activePresetLabelText, setActivePresetLabelText] = React.useState<string>('无');
    const [isPresetSynced, setIsPresetSynced] = React.useState(false);
    const [presetSnapshotSignature, setPresetSnapshotSignature] = React.useState<string | null>(null);
    const [isWaitingSnapshot, setIsWaitingSnapshot] = React.useState(false);
    const [presetTipArrowLeft, setPresetTipArrowLeft] = React.useState<number>(28);
    const presetButtonsRef = React.useRef<Array<HTMLButtonElement | null>>([]);
    const presetButtonsGroupRef = React.useRef<HTMLDivElement | null>(null);

    const parameterSignature = React.useMemo(
        () => JSON.stringify(simulationParameters.map((item) => ({ key: item.key, value: item.value }))),
        [simulationParameters],
    );

    React.useEffect(() => {
        if (!hint || hasAutoOpenedHint) return;
        setIsHintOpen(true);
        setHasAutoOpenedHint(true);
    }, [hint, hasAutoOpenedHint]);

    const toggleMultiOption = React.useCallback((questionId: string, optionIndex: number, checked: boolean) => {
        setMultiAnswers((prev) => {
            const current = prev[questionId] ?? [];
            const next = checked
                ? Array.from(new Set([...current, optionIndex])).sort((a, b) => a - b)
                : current.filter((idx) => idx !== optionIndex);
            return { ...prev, [questionId]: next };
        });
    }, []);

    const handleSubmit = React.useCallback(() => {
        const nextResult: QuestionResult = {};
        for (const question of questions) {
            if (question.type === 'multiple') {
                const selected = [...(multiAnswers[question.id] ?? [])].sort((a, b) => a - b);
                const correct = [...question.correctOptionIndexes].sort((a, b) => a - b);
                nextResult[question.id] =
                    selected.length === correct.length &&
                    selected.every((value, index) => value === correct[index]);
                continue;
            }
            if (question.type === 'single') {
                const selected = singleAnswers[question.id];
                nextResult[question.id] = selected === question.correctOptionIndex;
                continue;
            }
            const userText = (fillAnswers[question.id] ?? '').trim().toLowerCase();
            const accepted = question.acceptedAnswers.map((value) => value.trim().toLowerCase());
            nextResult[question.id] = accepted.includes(userText);
        }
        setResults(nextResult);
        setSubmitted(true);
    }, [questions, multiAnswers, singleAnswers, fillAnswers]);

    const totalCorrect = React.useMemo(() => {
        if (!submitted) return 0;
        return Object.values(results).filter((item) => item === true).length;
    }, [results, submitted]);

    const updatePresetTipArrowPosition = React.useCallback((index: number | null) => {
        const groupEl = presetButtonsGroupRef.current;
        if (!groupEl) return;

        const groupRect = groupEl.getBoundingClientRect();
        if (index === null) {
            setPresetTipArrowLeft(Math.max(16, groupRect.width / 2));
            return;
        }

        const buttonEl = presetButtonsRef.current[index];
        if (!buttonEl) {
            setPresetTipArrowLeft(Math.max(16, groupRect.width / 2));
            return;
        }

        const buttonRect = buttonEl.getBoundingClientRect();
        const anchorX = buttonRect.left - groupRect.left + buttonRect.width / 2;
        setPresetTipArrowLeft(Math.max(16, Math.min(anchorX, groupRect.width - 16)));
    }, []);

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

    React.useEffect(() => {
        if (!isPresetTipExpanded) return;
        updatePresetTipArrowPosition(activePresetIndex);
    }, [isPresetTipExpanded, activePresetIndex, updatePresetTipArrowPosition]);

    React.useEffect(() => {
        if (!isPresetTipExpanded) return;
        const onResize = () => updatePresetTipArrowPosition(activePresetIndex);
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [isPresetTipExpanded, activePresetIndex, updatePresetTipArrowPosition]);

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
                                                className="flex-wrap"
                                                ref={presetButtonsGroupRef}
                                            >
                                                {presets.map((preset, index) => (
                                                    <Button
                                                        key={`preset-${index}`}
                                                        size="small"
                                                        variant="outlined"
                                                        ref={(el) => {
                                                            presetButtonsRef.current[index] = el;
                                                        }}
                                                        onClick={() => handlePresetClick(preset, index)}
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
                                                <Paper
                                                    elevation={0}
                                                    sx={{
                                                        position: 'relative',
                                                        border: '1px solid',
                                                        borderColor: 'primary.main',
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        py: 1.25,
                                                        overflow: 'visible',
                                                        background: 'linear-gradient(135deg, rgba(59,130,246,0.16) 0%, rgba(59,130,246,0.05) 100%)',
                                                        boxShadow: '0 8px 18px rgba(59,130,246,0.14)',
                                                        ...(isPresetSynced && {
                                                            '&::before': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                top: -8,
                                                                left: `${presetTipArrowLeft - 6}px`,
                                                                width: 0,
                                                                height: 0,
                                                                borderLeft: '6px solid transparent',
                                                                borderRight: '6px solid transparent',
                                                                borderBottom: '8px solid',
                                                                borderBottomColor: 'primary.main',
                                                            },
                                                            '&::after': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                top: -6,
                                                                left: `${presetTipArrowLeft - 5}px`,
                                                                width: 0,
                                                                height: 0,
                                                                borderLeft: '5px solid transparent',
                                                                borderRight: '5px solid transparent',
                                                                borderBottom: '7px solid rgba(59,130,246,0.16)',
                                                            },
                                                        }),
                                                    }}
                                                >
                                                    <Stack spacing={1} direction="row" alignItems="flex-start">
                                                        <TipsAndUpdatesOutlinedIcon
                                                            sx={{
                                                                mt: '2px',
                                                                color: 'primary.main',
                                                                fontSize: 18,
                                                            }}
                                                        />
                                                        <Stack spacing={0.35}>
                                                            <Typography
                                                                component="div"
                                                                variant="caption"
                                                                sx={{
                                                                    fontSize: 12,
                                                                    color: isPresetSynced ? 'primary.dark' : 'text.secondary',
                                                                    fontWeight: isPresetSynced ? 700 : 500,
                                                                }}
                                                            >
                                                                当前预设：{activePresetLabelText}
                                                            </Typography>
                                                            <Typography component="div" variant="body2" sx={{ fontSize: 14, lineHeight: 1.6 }}>
                                                                {presetTip}
                                                            </Typography>
                                                        </Stack>
                                                    </Stack>
                                                </Paper>
                                            </Collapse>
                                        )}
                                    </Stack>
                                )}
                                {simulationParameters.length > 0 && <ParameterControls items={simulationParameters} />}
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
                <Box className="flex-1 min-h-0 overflow-auto px-6 py-4">
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" sx={{ fontSize: 20, mb: 0.5 }}>知识问答</Typography>
                            <Stack spacing={2} className="mt-2">
                                {questions.map((question, index) => {
                                    const result = results[question.id];
                                    return (
                                        <Box key={question.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2 }}>
                                            <Typography variant="body1" sx={{ mb: 1, fontSize: 16 }}>
                                                {index + 1}. {question.prompt}
                                            </Typography>

                                            {question.type === 'multiple' && (
                                                <Stack spacing={0.5}>
                                                    {question.options.map((option, optionIdx) => (
                                                        <FormControlLabel
                                                            key={`${question.id}-${optionIdx}`}
                                                            sx={{
                                                                '& .MuiFormControlLabel-label': {
                                                                    fontSize: 15,
                                                                },
                                                            }}
                                                            control={(
                                                                <Checkbox
                                                                    checked={(multiAnswers[question.id] ?? []).includes(optionIdx)}
                                                                    onChange={(event) => toggleMultiOption(question.id, optionIdx, event.target.checked)}
                                                                />
                                                            )}
                                                            label={option}
                                                        />
                                                    ))}
                                                </Stack>
                                            )}

                                            {question.type === 'single' && (
                                                <RadioGroup
                                                    value={singleAnswers[question.id] ?? -1}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        setSingleAnswers(prev => ({ ...prev, [question.id]: v }));
                                                    }}
                                                >
                                                    {question.options.map((option, optionIdx) => (
                                                        <FormControlLabel
                                                            key={`${question.id}-${optionIdx}`}
                                                            value={optionIdx}
                                                            control={<Radio />}
                                                            label={option}
                                                            sx={{
                                                                '& .MuiFormControlLabel-label': {
                                                                    fontSize: 15,
                                                                },
                                                            }}
                                                        />
                                                    ))}
                                                </RadioGroup>
                                            )}

                                            {question.type === 'fill' && (
                                                <TextField
                                                    fullWidth
                                                    size="small"
                                                    placeholder={question.placeholder ?? '请输入答案'}
                                                    value={fillAnswers[question.id] ?? ''}
                                                    sx={{
                                                        '& .MuiInputBase-input': {
                                                            fontSize: 15,
                                                        },
                                                    }}
                                                    onChange={(event) => {
                                                        const value = event.target.value;
                                                        setFillAnswers((prev) => ({ ...prev, [question.id]: value }));
                                                    }}
                                                />
                                            )}

                                            {submitted && result !== null && result !== undefined && (
                                                <Alert severity={result ? 'success' : 'warning'} sx={{ mt: 1.5 }}>
                                                    {result ? question.successTip : question.failTip}
                                                </Alert>
                                            )}
                                        </Box>
                                    );
                                })}
                            </Stack>

                            <Stack spacing={1.5} direction="row" className="items-center mt-3">
                                <Button variant="contained" onClick={handleSubmit}>提交答案</Button>
                                {submitted && (
                                    <Chip
                                        color={totalCorrect === questions.length ? 'success' : 'default'}
                                        label={`答对 ${totalCorrect} / ${questions.length}`}
                                    />
                                )}
                            </Stack>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="h6" sx={{ fontSize: 20, mb: 1 }}>知识梳理</Typography>
                            <Stack spacing={1}>
                                {summaryItems.map((item, index) => (
                                    <Typography key={`summary-${index}`} variant="body1" sx={{ fontSize: 16 }}>
                                        {index + 1}. {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>

                        <Divider />

                        <Box>
                            <Typography variant="h6" sx={{ fontSize: 20, mb: 1 }}>知识应用</Typography>
                            <Stack spacing={1}>
                                {applicationItems.map((item, index) => (
                                    <Typography key={`application-${index}`} variant="body1" sx={{ fontSize: 16 }}>
                                        {index + 1}. {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            )}

            {hint && (
                <Dialog
                    open={isHintOpen}
                    onClose={() => setIsHintOpen(false)}
                    maxWidth="sm"
                    fullWidth
                >
                    <DialogTitle>{hint.title ?? '提示'}</DialogTitle>
                    <DialogContent dividers>
                        <Typography component="div" variant="body1" sx={{ fontSize: 16 }}>
                            {hint.content}
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsHintOpen(false)} variant="contained">知道了</Button>
                    </DialogActions>
                </Dialog>
            )}
        </Box>
    );
}
