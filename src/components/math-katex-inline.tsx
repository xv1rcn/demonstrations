'use client';

import * as React from 'react';
import katex from 'katex';

type MathKatexInlineProps = {
    math: string;
    fallback: string;
};

export function MathKatexInline({math, fallback}: MathKatexInlineProps) {
    const normalizedMath = React.useMemo(
        () => math.replace(/\\\\/g, '\\').trim(),
        [math],
    );

    const html = React.useMemo(() => {
        try {
            return katex.renderToString(normalizedMath, {
                throwOnError: false,
                displayMode: false,
                strict: 'ignore',
            });
        } catch {
            return '';
        }
    }, [normalizedMath]);

    if (!html) {
        return <span>{fallback}</span>;
    }

    return (
        <span
            aria-label={fallback}
            dangerouslySetInnerHTML={{__html: html}}
        />
    );
}
