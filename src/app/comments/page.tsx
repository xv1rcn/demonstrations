'use client';

import * as React from 'react';
import {
    Container,
    Typography,
} from '@mui/material';
import { CommentsPanel } from '@/components/comments-panel';

export default function CommentsPage() {
    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                这是全站反馈页面。欢迎留言交流，学生发布的内容需要教师或管理员审核后才会公开。
            </Typography>

            <CommentsPanel
                targetType="feedback"
                targetTitle="全站留言板"
            />
        </Container>
    );
}
