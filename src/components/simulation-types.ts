import * as React from 'react';

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
