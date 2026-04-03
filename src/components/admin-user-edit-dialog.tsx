'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { AdminUser, updateAdminUser, resetAdminUserPassword, UpdateUserPayload } from '@/lib/admin-api';

type AdminUserEditDialogProps = {
    open: boolean;
    user?: AdminUser | null;
    onClose: () => void;
    onUpdated: (user: AdminUser) => void;
};

function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function AdminUserEditDialog({ open, user = null, onClose, onUpdated }: AdminUserEditDialogProps) {
    const [nickname, setNickname] = React.useState('');
    const [email, setEmail] = React.useState('');
    const [role, setRole] = React.useState<'student' | 'teacher' | 'admin'>('student');
    const [status, setStatus] = React.useState<'active' | 'disabled'>('active');
    const [newPassword, setNewPassword] = React.useState('');

    const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (!open || !user) return;
        setNickname(user.nickname);
        setEmail(user.email);
        setRole(user.role);
        setStatus(user.status);
        setNewPassword('');
        setFeedback(null);
    }, [open, user]);

    async function handleSaveProfile() {
        if (!user) return;

        const trimmedEmail = email.trim();
        const trimmedNickname = nickname.trim();
        const trimmedPassword = newPassword.trim();

        if (!trimmedNickname) {
            setFeedback({ type: 'error', message: '昵称不能为空' });
            return;
        }
        if (!isValidEmail(trimmedEmail)) {
            setFeedback({ type: 'error', message: '邮箱格式不正确' });
            return;
        }
        if (trimmedPassword && trimmedPassword.length < 6) {
            setFeedback({ type: 'error', message: '新密码长度至少 6 位' });
            return;
        }

        setSaving(true);
        setFeedback(null);

        // 保存用户信息
        const payload: UpdateUserPayload = {
            nickname: trimmedNickname,
            email: trimmedEmail,
            role,
            status,
        };

        const result = await updateAdminUser(user.id, payload);
        setSaving(false);

        if (!result.ok) {
            setFeedback({ type: 'error', message: result.message || '更新失败' });
            return;
        }

        // 如果有新密码，则重置密码
        if (trimmedPassword) {
            setSaving(true);
            const passwordResult = await resetAdminUserPassword(user.id, trimmedPassword);
            setSaving(false);

            if (!passwordResult.ok) {
                setFeedback({ type: 'error', message: passwordResult.message || '密码重置失败' });
                return;
            }
        }

        if (result.data) {
            setFeedback({ type: 'success', message: '保存成功' });
            setNewPassword('');
            onUpdated(result.data);
        }
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                编辑用户：{user?.username}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers sx={{ pt: 3 }}>
                {feedback && (
                    <Alert severity={feedback.type} sx={{ mb: 2 }}>
                        {feedback.message}
                    </Alert>
                )}

                <Stack spacing={2.5}>
                    {/* 基本信息 */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                            基本信息
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                label="用户名"
                                value={user?.username || ''}
                                disabled
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="昵称"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                fullWidth
                                size="small"
                            />
                            <TextField
                                label="邮箱"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                fullWidth
                                size="small"
                            />
                        </Stack>
                    </Box>

                    {/* 权限和状态 */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                            权限和状态
                        </Typography>
                        <Stack spacing={2}>
                            <FormControl fullWidth size="small">
                                <InputLabel>角色</InputLabel>
                                <Select value={role} onChange={(e) => setRole(e.target.value as typeof role)} label="角色">
                                    <MenuItem value="student">学生</MenuItem>
                                    <MenuItem value="teacher">教师</MenuItem>
                                    <MenuItem value="admin">管理员</MenuItem>
                                </Select>
                            </FormControl>
                            <FormControl fullWidth size="small">
                                <InputLabel>状态</InputLabel>
                                <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} label="状态">
                                    <MenuItem value="active">活跃</MenuItem>
                                    <MenuItem value="disabled">禁用</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    </Box>

                    {/* 重置密码 */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                            重置密码
                        </Typography>
                        <Stack spacing={2}>
                            <TextField
                                label="新密码"
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                fullWidth
                                size="small"
                                placeholder="留空不修改密码"
                            />
                            <Typography variant="caption" color="textSecondary">
                                最少 6 位字符。留空表示不修改用户密码。
                            </Typography>
                        </Stack>
                    </Box>

                    {/* 账号信息 */}
                    <Box>
                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                            账号信息
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                            创建于：{new Date(user?.created_at || '').toLocaleString('zh-CN')}
                        </Typography>
                        <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                            更新于：{new Date(user?.updated_at || '').toLocaleString('zh-CN')}
                        </Typography>
                        {user?.password_updated_at && (
                            <Typography variant="caption" component="div" sx={{ mb: 0.5 }}>
                                密码更新于：{new Date(user.password_updated_at).toLocaleString('zh-CN')}
                            </Typography>
                        )}
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions sx={{ gap: 1 }}>
                <Button onClick={onClose}>关闭</Button>
                <Button variant="contained" onClick={handleSaveProfile} disabled={saving}>
                    保存更改
                </Button>
            </DialogActions>
        </Dialog>
    );
}
