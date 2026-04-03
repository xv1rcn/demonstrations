'use client';

import * as React from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import RefreshIcon from '@mui/icons-material/Refresh';
import { AdminUser, fetchAdminUsers, softDeleteAdminUser, restoreAdminUser } from '@/lib/admin-api';
import { AdminUserEditDialog } from './admin-user-edit-dialog';

export function AdminUsersList() {
    const [users, setUsers] = React.useState<AdminUser[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [includeDeleted, setIncludeDeleted] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');

    const [editDialogOpen, setEditDialogOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<AdminUser | null>(null);

    const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
    const [deleteConfirmUser, setDeleteConfirmUser] = React.useState<AdminUser | null>(null);
    const [deleteConfirmLoading, setDeleteConfirmLoading] = React.useState(false);

    // 加载用户列表
    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await fetchAdminUsers(includeDeleted);
        if (result.ok && result.data) {
            setUsers(result.data.items);
        } else {
            setError(result.message || '加载用户列表失败');
        }
        setLoading(false);
    }, [includeDeleted]);

    React.useEffect(() => {
        loadUsers();
    }, [includeDeleted, loadUsers]);

    // 过滤用户
    const filteredUsers = React.useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(
            (u) =>
                u.username.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.nickname.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    // 编辑用户
    function handleEditUser(user: AdminUser) {
        setSelectedUser(user);
        setEditDialogOpen(true);
    }

    function handleEditDialogClose() {
        setEditDialogOpen(false);
        setSelectedUser(null);
    }

    function handleUserUpdated(updatedUser: AdminUser) {
        setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        handleEditDialogClose();
    }

    // 删除用户
    function handleDeleteUser(user: AdminUser) {
        setDeleteConfirmUser(user);
        setDeleteConfirmOpen(true);
    }

    async function handleConfirmDelete() {
        if (!deleteConfirmUser) return;
        setDeleteConfirmLoading(true);
        const result = await softDeleteAdminUser(deleteConfirmUser.id);
        setDeleteConfirmLoading(false);

        if (result.ok) {
            // 从列表中移除已删除的用户
            setUsers((prev) => prev.filter((u) => u.id !== deleteConfirmUser.id));
            setDeleteConfirmOpen(false);
            setDeleteConfirmUser(null);
        } else {
            alert(result.message || '删除失败');
        }
    }

    // 恢复用户
    async function handleRestoreUser(user: AdminUser) {
        const result = await restoreAdminUser(user.id);
        if (result.ok && result.data) {
            setUsers((prev) => prev.map((u) => (u.id === user.id ? (result.data as AdminUser) : u)));
        } else {
            alert(result.message || '恢复失败');
        }
    }

    // 角色标签
    function getRoleLabel(role: string): string {
        switch (role) {
            case 'admin':
                return '管理员';
            case 'teacher':
                return '教师';
            case 'student':
                return '学生';
            default:
                return role;
        }
    }

    function getRoleColor(role: string): 'error' | 'warning' | 'info' | 'default' {
        switch (role) {
            case 'admin':
                return 'error';
            case 'teacher':
                return 'warning';
            case 'student':
                return 'info';
            default:
                return 'default';
        }
    }

    // 状态标签
    function getStatusLabel(status: string): string {
        return status === 'active' ? '活跃' : '禁用';
    }

    function getStatusColor(status: string): 'success' | 'error' {
        return status === 'active' ? 'success' : 'error';
    }

    return (
        <Box sx={{ width: '100%' }}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* 工具栏 */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }} alignItems="stretch">
                <TextField
                    placeholder="搜索用户名、邮箱或昵称..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                />
                <Chip
                    label={includeDeleted ? '显示已删除用户: 开' : '显示已删除用户: 关'}
                    onClick={() => setIncludeDeleted(!includeDeleted)}
                    variant={includeDeleted ? 'filled' : 'outlined'}
                    color={includeDeleted ? 'warning' : 'default'}
                />
                <Tooltip title="刷新列表">
                    <Button variant="outlined" onClick={loadUsers} disabled={loading}>
                        <RefreshIcon />
                    </Button>
                </Tooltip>
            </Stack>

            {/* 用户表格 */}
            {loading && !users.length ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                <TableCell>用户名</TableCell>
                                <TableCell>邮箱</TableCell>
                                <TableCell>昵称</TableCell>
                                <TableCell align="center">角色</TableCell>
                                <TableCell align="center">状态</TableCell>
                                <TableCell align="center">创建时间</TableCell>
                                <TableCell align="right">操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {filteredUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                                        没有找到匹配的用户
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredUsers.map((user) => (
                                    <TableRow key={user.id} sx={{ opacity: user.deleted_at ? 0.6 : 1 }}>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{user.nickname}</TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={getRoleLabel(user.role)}
                                                color={getRoleColor(user.role)}
                                                size="small"
                                                variant="outlined"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip
                                                label={getStatusLabel(user.status)}
                                                color={getStatusColor(user.status)}
                                                size="small"
                                                variant="filled"
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <span title={user.created_at}>
                                                {new Date(user.created_at).toLocaleDateString('zh-CN')}
                                            </span>
                                        </TableCell>
                                        <TableCell align="right">
                                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                                {user.deleted_at ? (
                                                    <Tooltip title="恢复用户">
                                                        <IconButton
                                                            size="small"
                                                            color="success"
                                                            onClick={() => handleRestoreUser(user)}
                                                        >
                                                            <RestoreIcon fontSize="small" />
                                                        </IconButton>
                                                    </Tooltip>
                                                ) : (
                                                    <>
                                                        <Tooltip title="编辑用户">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={() => handleEditUser(user)}
                                                            >
                                                                <EditIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                        <Tooltip title="删除用户">
                                                            <IconButton
                                                                size="small"
                                                                color="error"
                                                                onClick={() => handleDeleteUser(user)}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </>
                                                )}
                                            </Stack>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* 编辑对话框 */}
            <AdminUserEditDialog
                open={editDialogOpen}
                user={selectedUser}
                onClose={handleEditDialogClose}
                onUpdated={handleUserUpdated}
            />

            {/* 删除确认对话框 */}
            <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
                <DialogTitle>确认删除用户</DialogTitle>
                <DialogContent>
                    确定要删除用户 <strong>{deleteConfirmUser?.username}</strong> 吗？删除后数据将不被恢复，除非手动恢复。
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDeleteConfirmOpen(false)}>取消</Button>
                    <Button
                        color="error"
                        variant="contained"
                        onClick={handleConfirmDelete}
                        disabled={deleteConfirmLoading}
                    >
                        确认删除
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
