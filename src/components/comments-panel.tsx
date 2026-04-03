'use client';

import * as React from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    Chip,
    CircularProgress,
    Divider,
    IconButton,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { usePathname } from 'next/navigation';
import {
    CommentItem,
    createComment,
    deleteComment,
    fetchTargetComments,
    moderateComment,
} from '@/lib/comments-api';

type AuthUser = {
    id: number;
    role: 'student' | 'teacher' | 'admin';
    nickname: string;
};

type CommentsPanelProps = {
    targetType: 'simulation' | 'lesson' | 'feedback';
    targetTitle: string;
};

function roleLabel(role: AuthUser['role']): string {
    if (role === 'admin') return '管理员';
    if (role === 'teacher') return '教师';
    return '学生';
}

function statusLabel(status: CommentItem['status']): string {
    if (status === 'approved') return '已通过';
    if (status === 'deleted') return '已删除';
    return '待审核';
}

function statusColor(status: CommentItem['status']): 'success' | 'error' | 'warning' {
    if (status === 'approved') return 'success';
    if (status === 'deleted') return 'error';
    return 'warning';
}

export function CommentsPanel({ targetType, targetTitle }: CommentsPanelProps) {
    const pathname = usePathname();
    const targetKey = pathname || '/';

    const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [items, setItems] = React.useState<CommentItem[]>([]);
    const [feedback, setFeedback] = React.useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [draft, setDraft] = React.useState('');
    const [saving, setSaving] = React.useState(false);
    const [deletingCommentId, setDeletingCommentId] = React.useState<number | null>(null);

    const [replyDraft, setReplyDraft] = React.useState<Record<number, string>>({});
    const [replyOpenFor, setReplyOpenFor] = React.useState<number | null>(null);

    const isModerator = currentUser?.role === 'teacher' || currentUser?.role === 'admin';

    const loadComments = React.useCallback(async () => {
        setLoading(true);
        const result = await fetchTargetComments(targetType, targetKey, Boolean(isModerator));
        if (result.ok && result.data) {
            setItems(result.data.items);
            setFeedback(null);
        } else {
            setFeedback({ type: 'error', message: result.message || '加载评论失败' });
        }
        setLoading(false);
    }, [isModerator, targetKey, targetType]);

    React.useEffect(() => {
        (async () => {
            const response = await fetch('/api/auth/me', { cache: 'no-store', credentials: 'include' }).catch(() => null);
            if (!response) {
                setCurrentUser(null);
                return;
            }
            if (!response.ok) {
                setCurrentUser(null);
                return;
            }
            const data = (await response.json().catch(() => null)) as AuthUser | null;
            setCurrentUser(data);
        })();
    }, []);

    React.useEffect(() => {
        loadComments();
    }, [loadComments]);

    const handleCreate = React.useCallback(
        async (parentId?: number) => {
            const content = (parentId ? (replyDraft[parentId] || '') : draft).trim();
            if (!content) {
                setFeedback({ type: 'error', message: '评论内容不能为空' });
                return;
            }

            setSaving(true);
            const result = await createComment({
                target_type: targetType,
                target_key: targetKey,
                target_title: targetTitle,
                content,
                parent_id: parentId,
            });
            setSaving(false);

            if (!result.ok) {
                setFeedback({ type: 'error', message: result.message || '发表评论失败' });
                return;
            }

            if (result.data?.needs_review) {
                setFeedback({ type: 'success', message: '评论已提交，等待教师或管理员审核后展示' });
            } else {
                setFeedback({ type: 'success', message: '评论发布成功' });
            }

            if (parentId) {
                setReplyDraft((prev) => ({ ...prev, [parentId]: '' }));
                setReplyOpenFor(null);
            } else {
                setDraft('');
            }
            await loadComments();
        },
        [draft, loadComments, replyDraft, targetKey, targetTitle, targetType],
    );

    const handleModerate = React.useCallback(
        async (commentId: number, action: 'approve' | 'reject') => {
            const result = await moderateComment(commentId, action);
            if (!result.ok) {
                setFeedback({ type: 'error', message: result.message || '审核失败' });
                return;
            }
            setFeedback({ type: 'success', message: action === 'approve' ? '审核通过' : '已删除' });
            await loadComments();
        },
        [loadComments],
    );

    const handleDelete = React.useCallback(
        async (commentId: number) => {
            setDeletingCommentId(commentId);
            const result = await deleteComment(commentId);
            setDeletingCommentId(null);

            if (!result.ok) {
                setFeedback({ type: 'error', message: result.message || '删除失败' });
                return;
            }

            setFeedback({ type: 'success', message: '评论已删除' });
            await loadComments();
        },
        [loadComments],
    );

    const renderComment = (comment: CommentItem, depth: number = 0) => {
        const canDelete = Boolean(currentUser && (isModerator || currentUser.id === comment.author.id));
        const shouldShowStatus = isModerator || comment.status !== 'approved';

        return (
            <Box key={comment.id} sx={{ ml: depth > 0 ? 3 : 0, mt: 1.25 }}>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 1.5 }}>
                    <Stack direction="row" spacing={1.2} alignItems="center" sx={{ mb: 1 }}>
                        <Avatar src={comment.author.avatar_url || undefined} sx={{ width: 30, height: 30 }}>
                            {comment.author.nickname.slice(0, 1)}
                        </Avatar>
                        <Typography variant="subtitle2">{comment.author.nickname}</Typography>
                        <Chip size="small" label={roleLabel(comment.author.role)} variant="outlined" />
                        {shouldShowStatus && (
                            <Chip
                                size="small"
                                label={statusLabel(comment.status)}
                                color={statusColor(comment.status)}
                                variant="outlined"
                            />
                        )}
                        <Box sx={{ flex: 1 }} />
                        <Typography variant="caption" color="text.secondary">
                            {new Date(comment.created_at).toLocaleString('zh-CN')}
                        </Typography>
                    </Stack>

                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                        {comment.content}
                    </Typography>

                    <Stack direction="row" spacing={1} sx={{ mt: 1.25 }}>
                        {currentUser && (
                            <Button size="small" onClick={() => setReplyOpenFor(comment.id)}>
                                回复
                            </Button>
                        )}
                        {isModerator && comment.status === 'pending' && (
                            <>
                                <Button size="small" color="success" onClick={() => handleModerate(comment.id, 'approve')}>
                                    通过
                                </Button>
                                <Button size="small" color="error" onClick={() => handleModerate(comment.id, 'reject')}>
                                    驳回并删除
                                </Button>
                            </>
                        )}
                        {canDelete && (
                            <Tooltip title="删除评论">
                                <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleDelete(comment.id)}
                                    disabled={deletingCommentId === comment.id}
                                    aria-label="删除评论"
                                >
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>

                    {replyOpenFor === comment.id && currentUser && (
                        <Stack spacing={1} sx={{ mt: 1.25 }}>
                            <TextField
                                size="small"
                                multiline
                                minRows={2}
                                placeholder="写下你的回复..."
                                value={replyDraft[comment.id] || ''}
                                onChange={(event) => {
                                    const value = event.target.value;
                                    setReplyDraft((prev) => ({ ...prev, [comment.id]: value }));
                                }}
                            />
                            <Stack direction="row" spacing={1}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    disabled={saving}
                                    onClick={() => handleCreate(comment.id)}
                                >
                                    提交回复
                                </Button>
                                <Button size="small" onClick={() => setReplyOpenFor(null)}>
                                    取消
                                </Button>
                            </Stack>
                        </Stack>
                    )}
                </Paper>

                {comment.replies.map((reply) => renderComment(reply, depth + 1))}
            </Box>
        );
    };

    return (
        <Box sx={{ mt: 2 }}>
            {feedback && (
                <Alert severity={feedback.type} sx={{ mb: 1.5 }} onClose={() => setFeedback(null)}>
                    {feedback.message}
                </Alert>
            )}

            <Stack spacing={1.25}>
                {currentUser ? (
                    <>
                        <TextField
                            multiline
                            minRows={3}
                            placeholder="说点什么吧..."
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                        />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" color="text.secondary">
                                当前身份：{roleLabel(currentUser.role)}。学生评论需审核后公开，教师和管理员评论即时公开。
                            </Typography>
                            <Button variant="contained" disabled={saving} onClick={() => handleCreate()}>
                                发布评论
                            </Button>
                        </Stack>
                    </>
                ) : (
                    <Alert severity="info">登录后可发布评论与回复。</Alert>
                )}
            </Stack>

            <Divider sx={{ my: 2 }} />

            {loading ? (
                <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}>
                    <CircularProgress size={24} />
                </Box>
            ) : items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                    还没有评论，欢迎发表第一条评论。
                </Typography>
            ) : (
                items.map((item) => renderComment(item))
            )}
        </Box>
    );
}
