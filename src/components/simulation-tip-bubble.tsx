import * as React from 'react';
import { Paper, Stack, Typography } from '@mui/material';
import TipsAndUpdatesOutlinedIcon from '@mui/icons-material/TipsAndUpdatesOutlined';

type SimulationTipBubbleProps = {
    isPresetSynced: boolean;
    activePresetLabelText: string;
    tip: React.ReactNode;
};

export function SimulationTipBubble({
    isPresetSynced,
    activePresetLabelText,
    tip,
}: SimulationTipBubbleProps) {
    return (
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
                        {tip}
                    </Typography>
                </Stack>
            </Stack>
        </Paper>
    );
}
