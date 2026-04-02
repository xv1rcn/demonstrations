'use client';

import * as React from 'react';
import {
    Alert,
    Avatar,
    Button,
    CircularProgress,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    Menu,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import EditNoteIcon from '@mui/icons-material/EditNote';
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

export function AuthControls() {
    const [isBootstrapping, setIsBootstrapping] = React.useState(true);
    const [user, setUser] = React.useState<AuthUser | null>(null);

    const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);

    const [authOpen, setAuthOpen] = React.useState(false);
    const [authTab, setAuthTab] = React.useState<'login' | 'register'>('login');
    const [authError, setAuthError] = React.useState('');
    const [authLoading, setAuthLoading] = React.useState(false);

    const [loginUsername, setLoginUsername] = React.useState('');
    const [loginPassword, setLoginPassword] = React.useState('');

    const [registerUsername, setRegisterUsername] = React.useState('');
    const [registerEmail, setRegisterEmail] = React.useState('');
    const [registerNickname, setRegisterNickname] = React.useState('');
    const [registerPassword, setRegisterPassword] = React.useState('');

    const [profileOpen, setProfileOpen] = React.useState(false);
    const [profileError, setProfileError] = React.useState('');
    const [profileSuccess, setProfileSuccess] = React.useState('');
    const [profileLoading, setProfileLoading] = React.useState(false);

    const [nickname, setNickname] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [oldPassword, setOldPassword] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [avatarFile, setAvatarFile] = React.useState<File | null>(null);

    const menuOpen = Boolean(menuAnchor);

    const loadMe = React.useCallback(async () => {
        const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
        if (!response) {
            setUser(null);
            return;
        }
        const result = await parseResponse<AuthUser>(response);
        if (!result.ok || !result.data) {
            setUser(null);
            return;
        }
        setUser(result.data);
    }, []);

    React.useEffect(() => {
        let isMounted = true;
        (async () => {
            const response = await fetch('/api/auth/me', { cache: 'no-store' }).catch(() => null);
            if (!isMounted) return;
            if (!response) {
                setUser(null);
                setIsBootstrapping(false);
                return;
            }
            const result = await parseResponse<AuthUser>(response);
            setUser(result.ok ? (result.data ?? null) : null);
            setIsBootstrapping(false);
        })();
        return () => {
            isMounted = false;
        };
    }, []);

    React.useEffect(() => {
        if (!profileOpen || !user) return;
        setNickname(user.nickname || '');
        setEmail(user.email || '');
    }, [profileOpen, user]);

    const openLoginDialog = React.useCallback(() => {
        setAuthError('');
        setAuthOpen(true);
        setAuthTab('login');
    }, []);

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
        if (!result.ok) {
            setAuthError(result.message ?? '登录失败');
            setAuthLoading(false);
            return;
        }

        setUser(result.data?.user ?? null);
        setAuthOpen(false);
        setLoginPassword('');
        setAuthLoading(false);
    }, [loginUsername, loginPassword]);

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

        setAuthTab('login');
        setLoginUsername(registerUsername.trim());
        setLoginPassword('');
        setRegisterPassword('');
        setAuthError('注册成功，请使用新账号登录');
        setAuthLoading(false);
    }, [registerUsername, registerEmail, registerNickname, registerPassword]);

    const handleLogout = React.useCallback(async () => {
        await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
        setMenuAnchor(null);
        setUser(null);
    }, []);

    const openProfile = React.useCallback(() => {
        setProfileError('');
        setProfileSuccess('');
        setMenuAnchor(null);
        setProfileOpen(true);
    }, []);

    const submitProfile = React.useCallback(async () => {
        setProfileError('');
        setProfileSuccess('');
        setProfileLoading(true);

        const response = await fetch('/api/auth/me', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ nickname: nickname.trim(), email: email.trim() }),
        }).catch(() => null);

        if (!response) {
            setProfileError('资料服务暂不可用，请稍后重试');
            setProfileLoading(false);
            return;
        }

        const result = await parseResponse<AuthUser>(response);
        if (!result.ok || !result.data) {
            setProfileError(result.message ?? '保存失败');
            setProfileLoading(false);
            return;
        }

        setUser(result.data);
        setProfileSuccess('资料已更新');
        setProfileLoading(false);
    }, [nickname, email]);

    const submitPassword = React.useCallback(async () => {
        setProfileError('');
        setProfileSuccess('');

        const response = await fetch('/api/auth/password', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
        }).catch(() => null);

        if (!response) {
            setProfileError('密码服务暂不可用，请稍后重试');
            return;
        }

        const result = await parseResponse<{ message: string }>(response);
        if (!result.ok) {
            setProfileError(result.message ?? '密码修改失败');
            return;
        }

        setOldPassword('');
        setNewPassword('');
        setProfileSuccess('密码已修改');
    }, [oldPassword, newPassword]);

    const submitAvatar = React.useCallback(async () => {
        if (!avatarFile) return;

        setProfileError('');
        setProfileSuccess('');
        const formData = new FormData();
        formData.append('avatar', avatarFile);

        const response = await fetch('/api/auth/avatar', {
            method: 'POST',
            body: formData,
        }).catch(() => null);

        if (!response) {
            setProfileError('头像服务暂不可用，请稍后重试');
            return;
        }

        const result = await parseResponse<{ avatar_url: string }>(response);
        if (!result.ok) {
            setProfileError(result.message ?? '头像上传失败');
            return;
        }

        await loadMe();
        setAvatarFile(null);
        setProfileSuccess('头像已更新');
    }, [avatarFile, loadMe]);

    if (isBootstrapping) {
        return <CircularProgress size={20} />;
    }

    return (
        <>
            {!user && (
                <Button variant="contained" onClick={openLoginDialog} startIcon={<PersonOutlineIcon />}>
                    登录
                </Button>
            )}

            {user && (
                <>
                    <Tooltip title={`${user.nickname} (${user.role})`}>
                        <IconButton color="primary" onClick={(event) => setMenuAnchor(event.currentTarget)}>
                            <Avatar src={user.avatar_url ?? undefined} alt={user.nickname} sx={{ width: 32, height: 32 }} />
                        </IconButton>
                    </Tooltip>
                    <Menu
                        anchorEl={menuAnchor}
                        open={menuOpen}
                        onClose={() => setMenuAnchor(null)}
                    >
                        <MenuItem disabled>{user.nickname}</MenuItem>
                        <MenuItem onClick={openProfile}>
                            <EditNoteIcon fontSize="small" sx={{ mr: 1 }} />
                            个人资料
                        </MenuItem>
                        <MenuItem onClick={handleLogout}>
                            <LogoutIcon fontSize="small" sx={{ mr: 1 }} />
                            退出登录
                        </MenuItem>
                    </Menu>
                </>
            )}

            <Dialog
                open={authOpen}
                onClose={() => setAuthOpen(false)}
                fullWidth
                maxWidth="xs"
                slotProps={{
                    backdrop: {
                        sx: {
                            backdropFilter: 'blur(2px)',
                            backgroundColor: 'rgba(15, 23, 42, 0.58)',
                        },
                    },
                }}
            >
                <DialogTitle className="flex items-center justify-between">
                    账号登录
                    <IconButton onClick={() => setAuthOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Tabs value={authTab} onChange={(_event, value) => setAuthTab(value)}>
                        <Tab value="login" label="登录" />
                        <Tab value="register" label="注册" />
                    </Tabs>

                    <Stack spacing={2.5} sx={{ mt: 2 }}>
                        {authError && <Alert severity={authError.includes('成功') ? 'success' : 'error'}>{authError}</Alert>}

                        {authTab === 'login' && (
                            <>
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
                                <Button variant="contained" disabled={authLoading} onClick={handleLogin}>
                                    {authLoading ? '登录中...' : '登录'}
                                </Button>
                            </>
                        )}

                        {authTab === 'register' && (
                            <>
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
                                <Button variant="contained" disabled={authLoading} onClick={handleRegister}>
                                    {authLoading ? '注册中...' : '注册'}
                                </Button>
                            </>
                        )}
                    </Stack>
                </DialogContent>
            </Dialog>

            <Dialog open={profileOpen} onClose={() => setProfileOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle className="flex items-center justify-between">
                    个人资料
                    <IconButton onClick={() => setProfileOpen(false)}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        {profileError && <Alert severity="error">{profileError}</Alert>}
                        {profileSuccess && <Alert severity="success">{profileSuccess}</Alert>}

                        <Typography variant="subtitle2">基础资料</Typography>
                        <TextField label="昵称" value={nickname} onChange={(event) => setNickname(event.target.value)} fullWidth />
                        <TextField label="邮箱" value={email} onChange={(event) => setEmail(event.target.value)} fullWidth />
                        <Button variant="contained" onClick={submitProfile} disabled={profileLoading}>
                            {profileLoading ? '保存中...' : '保存资料'}
                        </Button>

                        <Divider />

                        <Typography variant="subtitle2">头像</Typography>
                        <Stack direction="row" spacing={2} className="items-center">
                            <Avatar src={user?.avatar_url ?? undefined} sx={{ width: 64, height: 64 }} />
                            <Button component="label" variant="outlined">
                                选择头像
                                <input
                                    hidden
                                    type="file"
                                    accept="image/png,image/jpeg,image/webp"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0] ?? null;
                                        setAvatarFile(file);
                                    }}
                                />
                            </Button>
                            <Button variant="contained" disabled={!avatarFile} onClick={submitAvatar}>上传头像</Button>
                        </Stack>
                        <Typography variant="caption" color="text.secondary">
                            支持 png、jpg、webp，最大 2MB，服务端会自动裁剪为 256x256。
                        </Typography>

                        <Divider />

                        <Typography variant="subtitle2">修改密码</Typography>
                        <TextField
                            label="旧密码"
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
                        <Button variant="outlined" onClick={submitPassword}>修改密码</Button>
                    </Stack>
                </DialogContent>
            </Dialog>
        </>
    );
}
