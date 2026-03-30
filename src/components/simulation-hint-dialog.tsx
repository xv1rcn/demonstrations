'use client';

import * as React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Typography,
} from '@mui/material';
import type { SimulationHint } from '@/components/simulation-types';

type SimulationHintDialogProps = {
    hint: SimulationHint;
    isOpen: boolean;
    onClose: () => void;
};

const INDENT_TEXT = '\u3000\u3000';

function withIndentAfterBr(content: React.ReactNode): React.ReactNode {
    return React.Children.map(content, (child) => {
        if (!React.isValidElement(child)) {
            return child;
        }

        if (child.type === 'br') {
            return (
                <React.Fragment>
                    <br />
                    {INDENT_TEXT}
                </React.Fragment>
            );
        }

        const props = child.props as { children?: React.ReactNode };
        if (props.children === undefined) {
            return child;
        }

        return React.cloneElement(child, undefined, withIndentAfterBr(props.children));
    });
}

export function SimulationHintDialog({ hint, isOpen, onClose }: SimulationHintDialogProps) {
    const contentWithIndent = React.useMemo(() => withIndentAfterBr(hint.content), [hint.content]);

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{hint.title ?? '提示'}</DialogTitle>
            <DialogContent dividers>
                <Typography component="div" variant="body1" sx={{ fontSize: 16, textIndent: '2em' }}>
                    {contentWithIndent}
                </Typography>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} variant="contained">知道了</Button>
            </DialogActions>
        </Dialog>
    );
}
