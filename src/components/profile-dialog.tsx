'use client';

import * as React from 'react';
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Alert,
    Box,
    Button,
    Dialog,
    DialogContent,
    DialogTitle,
    IconButton,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

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

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ProfileDialogProps = {
    open: boolean;
    user?: AuthUser | null;
    onClose: () => void;
    onUpdated: (user: AuthUser) => void;
    onDeleted: () => void;
};

export function ProfileDialog({ open, user = null, onClose, onUpdated, onDeleted }: ProfileDialogProps) {
    const [expandedPanel, setExpandedPanel] = React.useState<'profile' | 'password' | 'danger'>('profile');
    const [hasInitializedForOpen, setHasInitializedForOpen] = React.useState(false);
    const [resolvedUser, setResolvedUser] = React.useState<AuthUser | null>(null);

    const [nickname, setNickname] = React.useState('');
    const [email, setEmail] = React.useState('');

    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);
    const [avatarPreviewUrl, setAvatarPreviewUrl] = React.useState<string | null>(null);

    const [oldPassword, setOldPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmNewPassword, setConfirmNewPassword] = React.useState('');

    const [deletePassword, setDeletePassword] = React.useState('');
    const [deleteConfirmText, setDeleteConfirmText] = React.useState('');

    const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [savingProfile, setSavingProfile] = React.useState(false);
    const [savingPassword, setSavingPassword] = React.useState(false);
    const [deletingAccount, setDeletingAccount] = React.useState(false);

    React.useEffect(() => {
        if (!open) return;
        if (user) {
            setResolvedUser(user);
            return;
        }

        let cancelled = false;
        (async () => {
            const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
            if (cancelled) return;
            if (!response) {
                setResolvedUser(null);
                return;
            }
            const result = await parseResponse<AuthUser>(response);
            setResolvedUser(result.ok ? (result.data ?? null) : null);
        })();

        return () => {
            cancelled = true;
        };
    }, [open, user]);

    React.useEffect(() => {
        if (!open) {
            setHasInitializedForOpen(false);
            return;
        }
        if (!resolvedUser || hasInitializedForOpen) return;

        setExpandedPanel('profile');
        setNickname(resolvedUser.nickname ?? '');
        setEmail(resolvedUser.email ?? '');
        setAvatarFile(null);
        setAvatarPreviewUrl(null);

        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');

        setDeletePassword('');
        setDeleteConfirmText('');
        setFeedback(null);
        setHasInitializedForOpen(true);
    }, [hasInitializedForOpen, open, resolvedUser]);

    React.useEffect(() => {
        if (!open) return;
        if (resolvedUser) return;
        setFeedback({ type: 'error', message: '未获取到登录用户信息，请重新登录后重试。' });
    }, [open, resolvedUser]);

    React.useEffect(() => {
        if (!avatarFile) {
            setAvatarPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(avatarFile);
        setAvatarPreviewUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [avatarFile]);

    const handleSaveProfile = React.useCallback(async () => {
        if (!resolvedUser) return;
        setFeedback(null);

        const nextNickname = nickname.trim();
        const nextEmail = email.trim().toLowerCase();

        if (!nextNickname) {
            setFeedback({ type: 'error', message: '昵称不能为空' });
            return;
        }
        if (nextNickname.length > 32) {
            setFeedback({ type: 'error', message: '昵称长度不能超过 32' });
            return;
        }
        if (!isValidEmail(nextEmail)) {
            setFeedback({ type: 'error', message: '邮箱格式不正确' });
            return;
        }

        const profilePayload: { nickname?: string; email?: string } = {};
        if (nextNickname !== resolvedUser.nickname) {
            profilePayload.nickname = nextNickname;
        }
        if (nextEmail !== resolvedUser.email) {
            profilePayload.email = nextEmail;
        }

        const hasProfileChange = Object.keys(profilePayload).length > 0;
        const hasAvatarChange = Boolean(avatarFile);

        if (!hasProfileChange && !hasAvatarChange) {
            setFeedback({ type: 'success', message: '没有可保存的变更' });
            return;
        }

        setSavingProfile(true);

        let updatedUser: AuthUser = resolvedUser;

        if (hasProfileChange) {
            const profileResponse = await fetch('/api/auth/me', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profilePayload),
            }).catch(() => null);

            if (!profileResponse) {
                setFeedback({ type: 'error', message: '资料服务暂不可用，请稍后重试' });
                setSavingProfile(false);
                return;
            }

            const profileResult = await parseResponse<AuthUser>(profileResponse);
            if (!profileResult.ok || !profileResult.data) {
                setFeedback({ type: 'error', message: profileResult.message ?? '资料保存失败' });
                setSavingProfile(false);
                return;
            }
            updatedUser = profileResult.data;
        }

        if (hasAvatarChange && avatarFile) {
            const formData = new FormData();
            formData.append('avatar', avatarFile, avatarFile.name);

            const avatarResponse = await fetch('/api/auth/avatar', {
                method: 'POST',
                body: formData,
            }).catch(() => null);

            if (!avatarResponse) {
                setFeedback({ type: 'error', message: '头像服务暂不可用，请稍后重试' });
                setSavingProfile(false);
                return;
            }

            const avatarResult = await parseResponse<{ avatar_url: string | null }>(avatarResponse);
            if (!avatarResult.ok || !avatarResult.data) {
                setFeedback({ type: 'error', message: avatarResult.message ?? '头像上传失败' });
                setSavingProfile(false);
                return;
            }
            updatedUser = { ...updatedUser, avatar_url: avatarResult.data.avatar_url };
        }

        setSavingProfile(false);
        setAvatarFile(null);
        setFeedback({ type: 'success', message: '资料已保存' });
        setResolvedUser(updatedUser);
        onUpdated(updatedUser);
    }, [avatarFile, email, nickname, onUpdated, resolvedUser]);

    const handleChangePassword = React.useCallback(async () => {
        setFeedback(null);

        if (!oldPassword || !newPassword || !confirmNewPassword) {
            setFeedback({ type: 'error', message: '请填写完整的密码信息' });
            return;
        }
        if (newPassword.length < 6) {
            setFeedback({ type: 'error', message: '新密码长度至少 6 位' });
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setFeedback({ type: 'error', message: '两次输入的新密码不一致' });
            return;
        }

        setSavingPassword(true);

        const response = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                old_password: oldPassword,
                new_password: newPassword,
            }),
        }).catch(() => null);

        if (!response) {
            setFeedback({ type: 'error', message: '密码服务暂不可用，请稍后重试' });
            setSavingPassword(false);
            return;
        }

        const result = await parseResponse<{ message?: string }>(response);
        if (!result.ok) {
            setFeedback({ type: 'error', message: result.message ?? '修改密码失败' });
            setSavingPassword(false);
            return;
        }

        setSavingPassword(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setFeedback({ type: 'success', message: '密码修改成功' });
    }, [confirmNewPassword, newPassword, oldPassword]);

    const handleDeleteAccount = React.useCallback(async () => {
        setFeedback(null);

        if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
            setFeedback({ type: 'error', message: '请输入 DELETE 以确认删除账号' });
            return;
        }
        if (!deletePassword) {
            setFeedback({ type: 'error', message: '请输入当前密码以确认删除' });
            return;
        }

        setDeletingAccount(true);

        const response = await fetch('/api/auth/me', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: deletePassword }),
        }).catch(() => null);

        if (!response) {
            setFeedback({ type: 'error', message: '删除账号服务暂不可用，请稍后重试' });
            setDeletingAccount(false);
            return;
        }

        const result = await parseResponse<{ ok?: boolean }>(response);
        if (!result.ok) {
            setFeedback({ type: 'error', message: result.message ?? '删除账号失败' });
            setDeletingAccount(false);
            return;
        }

        setDeletingAccount(false);
        onDeleted();
        onClose();
    }, [deleteConfirmText, deletePassword, onClose, onDeleted]);

    const handleTogglePanel = React.useCallback(
        (panel: 'profile' | 'password' | 'danger') => (_event: React.SyntheticEvent, isExpanded: boolean) => {
            if (isExpanded) {
                setExpandedPanel(panel);
            }
        },
        []
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
            fullWidth
            maxWidth={false}
            TransitionProps={{ timeout: 220 }}
            slotProps={{
                backdrop: {
                    sx: {
                        backdropFilter: 'blur(4px)',
                        backgroundColor: 'rgba(2, 6, 23, 0.65)',
                    },
                },
                paper: {
                    sx: {
                        borderRadius: 0,
                        backgroundColor: 'transparent',
                        boxShadow: 'none',
                        backgroundImage: 'none',
                    },
                },
            }}
        >
            <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 2 }}>
                <Box
                    sx={{
                        width: '100%',
                        maxWidth: 680,
                        bgcolor: 'background.paper',
                        borderRadius: 3,
                        border: '1px solid',
                        borderColor: 'divider',
                        boxShadow: '0 24px 48px rgba(2, 6, 23, 0.35)',
                    }}
                >
                    <DialogTitle className="flex items-center justify-between" sx={{ pb: 1 }}>
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                个人资料设置
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                支持修改昵称、邮箱、头像、密码及删除账号。
                            </Typography>
                        </Box>
                        <IconButton onClick={onClose}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent sx={{ maxHeight: '72vh', overflowY: 'auto' }}>
                        <Stack spacing={2} sx={{ mt: 1 }}>
                            {feedback && <Alert severity={feedback.type}>{feedback.message}</Alert>}

                            <Accordion
                                disableGutters
                                expanded={expandedPanel === 'profile'}
                                onChange={handleTogglePanel('profile')}
                                TransitionProps={{ timeout: 240 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        基本资料
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="昵称"
                                            value={nickname}
                                            onChange={(event) => setNickname(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="邮箱"
                                            value={email}
                                            onChange={(event) => setEmail(event.target.value)}
                                            fullWidth
                                        />
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                                            <Button variant="outlined" component="label">
                                                选择头像
                                                <input
                                                    hidden
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(event) => {
                                                        const selected = event.target.files?.[0] ?? null;
                                                        setAvatarFile(selected);
                                                    }}
                                                />
                                            </Button>
                                            <Typography variant="body2" color="text.secondary">
                                                {avatarFile ? avatarFile.name : '未选择新头像'}
                                            </Typography>
                                            {avatarPreviewUrl && (
                                                <Box
                                                    component="img"
                                                    src={avatarPreviewUrl}
                                                    alt="avatar preview"
                                                    sx={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                variant="contained"
                                                onClick={handleSaveProfile}
                                                disabled={savingProfile || !resolvedUser}
                                            >
                                                {savingProfile ? '保存中...' : '保存资料'}
                                            </Button>
                                        </Box>
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>

                            <Accordion
                                disableGutters
                                expanded={expandedPanel === 'password'}
                                onChange={handleTogglePanel('password')}
                                TransitionProps={{ timeout: 240 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1" fontWeight={600}>
                                        修改密码
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="当前密码"
                                            type="password"
                                            value={oldPassword}
                                            onChange={(event) => setOldPassword(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="新密码"
                                            type="password"
                                            value={newPassword}
                                            onChange={(event) => setNewPassword(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="确认新密码"
                                            type="password"
                                            value={confirmNewPassword}
                                            onChange={(event) => setConfirmNewPassword(event.target.value)}
                                            fullWidth
                                        />
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                variant="contained"
                                                color="warning"
                                                onClick={handleChangePassword}
                                                disabled={savingPassword}
                                            >
                                                {savingPassword ? '提交中...' : '修改密码'}
                                            </Button>
                                        </Box>
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>

                            <Accordion
                                disableGutters
                                expanded={expandedPanel === 'danger'}
                                onChange={handleTogglePanel('danger')}
                                TransitionProps={{ timeout: 240 }}
                            >
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1" fontWeight={600} color="error.main">
                                        危险操作
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <Stack spacing={1.5}>
                                        <TextField
                                            label="输入 DELETE 确认删除"
                                            value={deleteConfirmText}
                                            onChange={(event) => setDeleteConfirmText(event.target.value)}
                                            fullWidth
                                        />
                                        <TextField
                                            label="当前密码"
                                            type="password"
                                            value={deletePassword}
                                            onChange={(event) => setDeletePassword(event.target.value)}
                                            fullWidth
                                        />
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Button
                                                variant="contained"
                                                color="error"
                                                onClick={handleDeleteAccount}
                                                disabled={deletingAccount}
                                            >
                                                {deletingAccount ? '删除中...' : '删除账号'}
                                            </Button>
                                        </Box>
                                    </Stack>
                                </AccordionDetails>
                            </Accordion>
                        </Stack>
                    </DialogContent>
                </Box>
            </Box>
        </Dialog>
    );
}
