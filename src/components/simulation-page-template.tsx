'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    Radio,
    RadioGroup,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import {ParameterControls, type ParameterItem} from '@/components/parameter-controls';

export type SimulationPreset = {
    label: string;
    onClick: () => void;
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
    questions,
    summaryItems,
    applicationItems,
}: SimulationPageTemplateProps) {
    const [tab, setTab] = React.useState<'simulation' | 'knowledge'>('simulation');
    const [multiAnswers, setMultiAnswers] = React.useState<Record<string, number[]>>({});
    const [singleAnswers, setSingleAnswers] = React.useState<Record<string, number>>({});
    const [fillAnswers, setFillAnswers] = React.useState<Record<string, string>>({});
    const [results, setResults] = React.useState<QuestionResult>({});
    const [submitted, setSubmitted] = React.useState(false);

    const toggleMultiOption = React.useCallback((questionId: string, optionIndex: number, checked: boolean) => {
        setMultiAnswers((prev) => {
            const current = prev[questionId] ?? [];
            const next = checked
                ? Array.from(new Set([...current, optionIndex])).sort((a, b) => a - b)
                : current.filter((idx) => idx !== optionIndex);
            return {...prev, [questionId]: next};
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

    return (
        <Box className="min-h-screen w-full">
            <Box sx={{borderBottom: 1, borderColor: 'divider', px: 2, pt: 1}}>
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
                    <Tab value="simulation" label="模拟仿真"/>
                    <Tab value="knowledge" label="知识学习"/>
                </Tabs>
            </Box>

            {tab === 'simulation' && (
                <Box className="h-[calc(100vh-64px)] overflow-auto px-6 py-4">
                    <Box className="min-h-full flex items-center">
                        <Box className="flex flex-row w-full">
                            <Stack spacing={4} direction="column" className="justify-center w-[31rem] mr-6">
                                {presets.length > 0 && (
                                    <Stack spacing={1} direction="row" className="flex-wrap">
                                        {presets.map((preset) => (
                                            <Button key={preset.label} size="small" variant="outlined" onClick={preset.onClick}>
                                                {preset.label}
                                            </Button>
                                        ))}
                                    </Stack>
                                )}
                                {simulationParameters.length > 0 && <ParameterControls items={simulationParameters}/>} 
                                {simulationControlsFooter && (
                                    <Stack spacing={2}>
                                        {simulationParameters.length > 0 && <Divider/>}
                                        {simulationControlsFooter}
                                    </Stack>
                                )}
                                {simulationControls}
                            </Stack>
                            <Divider orientation="vertical" flexItem/>
                            <Box className="mx-6 my-2">{simulationVisualization}</Box>
                        </Box>
                    </Box>
                </Box>
            )}

            {tab === 'knowledge' && (
                <Box className="h-[calc(100vh-64px)] overflow-auto px-6 py-4">
                    <Stack spacing={3}>
                        <Box>
                            <Typography variant="h6" sx={{fontSize: 20, mb: 0.5}}>知识问答</Typography>
                            <Stack spacing={2} className="mt-2">
                                {questions.map((question, index) => {
                                    const result = results[question.id];
                                    return (
                                        <Box key={question.id} sx={{border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 2}}>
                                            <Typography variant="body1" sx={{mb: 1, fontSize: 16}}>
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
                                                        setSingleAnswers(prev => ({...prev, [question.id]: v}));
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
                                                        setFillAnswers((prev) => ({...prev, [question.id]: value}));
                                                    }}
                                                />
                                            )}

                                            {submitted && result !== null && result !== undefined && (
                                                <Alert severity={result ? 'success' : 'warning'} sx={{mt: 1.5}}>
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

                        <Divider/>

                        <Box>
                            <Typography variant="h6" sx={{fontSize: 20, mb: 1}}>知识梳理</Typography>
                            <Stack spacing={1}>
                                {summaryItems.map((item, index) => (
                                    <Typography key={`summary-${index}`} variant="body1" sx={{fontSize: 16}}>
                                        {index + 1}. {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>

                        <Divider/>

                        <Box>
                            <Typography variant="h6" sx={{fontSize: 20, mb: 1}}>知识应用</Typography>
                            <Stack spacing={1}>
                                {applicationItems.map((item, index) => (
                                    <Typography key={`application-${index}`} variant="body1" sx={{fontSize: 16}}>
                                        {index + 1}. {item}
                                    </Typography>
                                ))}
                            </Stack>
                        </Box>
                    </Stack>
                </Box>
            )}
        </Box>
    );
}
