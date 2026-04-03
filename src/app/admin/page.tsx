'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    Divider,
    Stack,
    Typography,
    Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { AdminUsersList } from '@/components/admin-users-list';
import { DASHBOARD_ROUTE } from '@/lib/routes';

type AuthUser = {
    id: number;
    username: string;
    email: string;
    nickname: string;
    avatar_url: string | null;
    role: 'student' | 'teacher' | 'admin';
    status: 'active' | 'disabled';
};

type ApiResult<T> = {
    ok: boolean;
    data?: T;
    message?: string;
};

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
    const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!response.ok) {
        return {
            ok: false,
            message: body?.message ?? '请求失败，请稍后重试',
        };
    }
    return { ok: true, data: body as T };
}

export default function AdminPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    React.useEffect(() => {
        if (!mounted) return;

        async function checkAuth() {
            const response = await fetch('/api/auth/me', { 
                cache: 'no-store',
                credentials: 'include',
            }).catch(() => null);
            if (!response) {
                setError('网络连接失败');
                setLoading(false);
                return;
            }

            const result = await parseResponse<AuthUser>(response);
            if (!result.ok) {
                setError('未登录或权限不足');
                setLoading(false);
                return;
            }

            const user = result.data;
            if (user?.role !== 'admin') {
                setError('您没有管理员权限');
                setLoading(false);
                return;
            }

            setCurrentUser(user);
            setLoading(false);
        }

        checkAuth();
    }, [mounted]);

    if (!mounted) {
        return null;
    }

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
                <Button
                    variant="contained"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push(DASHBOARD_ROUTE)}
                >
                    返回仪表板
                </Button>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            {/* 标题栏 */}
            <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 4 }}
            >
                <Stack direction="row" spacing={2} alignItems="center">
                    <AdminPanelSettingsIcon sx={{ fontSize: 32, color: 'primary.main' }} />
                    <Box>
                        <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                            管理员面板
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            欢迎回来，{currentUser?.nickname || currentUser?.username}
                        </Typography>
                    </Box>
                </Stack>
                <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={() => router.push(DASHBOARD_ROUTE)}
                >
                    返回仪表板
                </Button>
            </Stack>

            <Divider sx={{ mb: 4 }} />

            {/* 用户管理 */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    用户管理
                </Typography>
                <AdminUsersList />
            </Box>
        </Container>
    );
}
