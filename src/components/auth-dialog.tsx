'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    Fade,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

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

type AuthDialogProps = {
    open: boolean;
    fullScreen?: boolean;
    onClose: () => void;
    onAuthed?: (user: AuthUser) => void;
};

export function AuthDialog({ open, fullScreen = false, onClose, onAuthed }: AuthDialogProps) {
    const [authMode, setAuthMode] = React.useState<'login' | 'register'>('login');
    const [authError, setAuthError] = React.useState('');
    const [authLoading, setAuthLoading] = React.useState(false);

    const [loginUsername, setLoginUsername] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');

    const [registerUsername, setRegisterUsername] = React.useState('');
    const [registerEmail, setRegisterEmail] = React.useState('');
    const [registerNickname, setRegisterNickname] = React.useState('');
    const [registerPassword, setRegisterPassword] = React.useState('');

    React.useEffect(() => {
        if (!open) return;
        setAuthMode('login');
        setAuthError('');
    }, [open]);

    const handleLogin = React.useCallback(async () => {
        setAuthError('');
        setAuthLoading(true);

        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
        }).catch(() => null);

        if (!response) {
            setAuthError('登录服务暂不可用，请稍后重试');
            setAuthLoading(false);
            return;
        }

        const result = await parseResponse<{ ok: boolean; user?: AuthUser }>(response);
        if (!result.ok || !result.data?.user) {
            setAuthError(result.message ?? '登录失败');
            setAuthLoading(false);
            return;
        }

        setLoginPassword('');
        setAuthLoading(false);
        onAuthed?.(result.data.user);
        onClose();
    }, [loginUsername, loginPassword, onAuthed, onClose]);

    const handleRegister = React.useCallback(async () => {
        setAuthError('');
        setAuthLoading(true);

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: registerUsername.trim(),
                email: registerEmail.trim(),
                nickname: registerNickname.trim(),
                password: registerPassword,
            }),
        }).catch(() => null);

        if (!response) {
            setAuthError('注册服务暂不可用，请稍后重试');
            setAuthLoading(false);
            return;
        }

        const result = await parseResponse<{ username: string }>(response);
        if (!result.ok) {
            setAuthError(result.message ?? '注册失败');
            setAuthLoading(false);
            return;
        }

        setAuthMode('login');
        setLoginUsername(registerUsername.trim());
        setRegisterPassword('');
        setAuthError('注册成功，请登录');
        setAuthLoading(false);
    }, [registerUsername, registerEmail, registerNickname, registerPassword]);

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            fullScreen={fullScreen}
            maxWidth={fullScreen ? false : 'xs'}
            TransitionProps={{
                timeout: 220,
            }}
            slotProps={{
                backdrop: {
                    sx: {
                        backdropFilter: 'blur(4px)',
                        backgroundColor: 'rgba(2, 6, 23, 0.65)',
                    },
                },
                paper: {
                    sx: fullScreen
                        ? {
                            borderRadius: 0,
                        }
                        : {
                            borderRadius: 3,
                            border: '1px solid',
                            borderColor: 'rgba(148,163,184,0.25)',
                            boxShadow: '0 24px 48px rgba(2, 6, 23, 0.35)',
                        },
                },
            }}
        >
            <Box sx={fullScreen ? { minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 } : undefined}>
                <Box sx={fullScreen ? { width: '100%', maxWidth: 460, bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider' } : undefined}>
                    <DialogTitle className="flex items-center justify-between" sx={{ pb: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                {authMode === 'login' ? '欢迎回来' : '创建账号'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                {authMode === 'login' ? '登录后可同步头像、昵称。' : '注册后即可使用完整个人资料功能。'}
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        <Stack spacing={2.5} sx={{ mt: 1 }}>
                            {authError && <Alert severity={authError.includes('成功') ? 'success' : 'error'}>{authError}</Alert>}

                            <Box
                                key={authMode}
                                sx={{
                                    animation: 'authPanelIn 220ms ease',
                                    '@keyframes authPanelIn': {
                                        from: { opacity: 0, transform: 'translateY(10px)' },
                                        to: { opacity: 1, transform: 'translateY(0)' },
                                    },
                                }}
                            >
                                {authMode === 'login' && (
                                    <Stack spacing={2}>
                                        <TextField
                                            label="用户名或邮箱"
                                            value={loginUsername}
                                            onChange={(event) => setLoginUsername(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="密码"
                                            type="password"
                                            value={loginPassword}
                                            onChange={(event) => setLoginPassword(event.target.value)}
                                            fullWidth
                                        />
                                        <Button
                                            variant="contained"
                                            size="large"
                                            disabled={authLoading}
                                            onClick={handleLogin}
                                            sx={{ py: 1.2 }}
                                        >
                                            {authLoading ? '登录中...' : '登录'}
                                        </Button>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => {
                                                    setAuthError('');
                                                    setAuthMode('register');
                                                }}
                                            >
                                                还没有账号？去注册
                                            </Button>
                                        </Box>
                                    </Stack>
                                )}

                                {authMode === 'register' && (
                                    <Stack spacing={2}>
                                        <TextField
                                            label="用户名"
                                            value={registerUsername}
                                            onChange={(event) => setRegisterUsername(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="邮箱"
                                            value={registerEmail}
                                            onChange={(event) => setRegisterEmail(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="昵称"
                                            value={registerNickname}
                                            onChange={(event) => setRegisterNickname(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="密码"
                                            type="password"
                                            value={registerPassword}
                                            onChange={(event) => setRegisterPassword(event.target.value)}
                                            fullWidth
                                        />
                                        <Button
                                            variant="contained"
                                            size="large"
                                            disabled={authLoading}
                                            onClick={handleRegister}
                                            sx={{ py: 1.2 }}
                                        >
                                            {authLoading ? '注册中...' : '注册账号'}
                                        </Button>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                size="small"
                                                variant="text"
                                                onClick={() => {
                                                    setAuthError('');
                                                    setAuthMode('login');
                                                }}
                                            >
                                                已有账号？返回登录
                                            </Button>
                                        </Box>
                                    </Stack>
                                )}
                            </Box>

                            <Fade in timeout={200}>
                                <Typography variant="caption" color="text.secondary" textAlign="center">
                                    登录后可跨页面同步个人资料与头像。
                                </Typography>
                            </Fade>
                        </Stack>
                    </DialogContent>
                </Box>
            </Box>
        </Dialog>
    );
}
