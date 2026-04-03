export type CommentAuthor = {
    id: number;
    nickname: string;
    role: 'student' | 'teacher' | 'admin';
    avatar_url: string | null;
};

export type CommentItem = {
    id: number;
    parent_id: number | null;
    target_type: 'simulation' | 'lesson' | 'feedback';
    target_key: string;
    target_title: string;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    updated_at: string;
    reviewed_at: string | null;
    author: CommentAuthor;
    reviewer_nickname: string | null;
    replies: CommentItem[];
};

type ApiResult<T> = {
    ok: boolean;
    data?: T;
    message?: string;
};

async function parseResponse<T>(response: Response): Promise<ApiResult<T>> {
    const body = (await response.json().catch(() => null)) as (T & { message?: string }) | null;
    if (!response.ok) {
        return { ok: false, message: body?.message ?? '请求失败，请稍后重试' };
    }
    return { ok: true, data: body as T };
}

export async function fetchTargetComments(
    targetType: 'simulation' | 'lesson' | 'feedback',
    targetKey: string,
    includePending: boolean,
): Promise<ApiResult<{ items: CommentItem[] }>> {
    const url = new URL('/api/comments', window.location.origin);
    url.searchParams.set('target_type', targetType);
    url.searchParams.set('target_key', targetKey);
    if (includePending) {
        url.searchParams.set('include_pending', 'true');
    }

    const response = await fetch(url.toString(), { cache: 'no-store', credentials: 'include' }).catch(() => null);
    if (!response) {
        return { ok: false, message: '评论服务暂不可用' };
    }
    return parseResponse<{ items: CommentItem[] }>(response);
}

export async function createComment(payload: {
    target_type: 'simulation' | 'lesson' | 'feedback';
    target_key: string;
    target_title: string;
    content: string;
    parent_id?: number;
}): Promise<ApiResult<{ item: CommentItem; needs_review: boolean }>> {
    const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        credentials: 'include',
    }).catch(() => null);
    if (!response) {
        return { ok: false, message: '评论服务暂不可用' };
    }
    return parseResponse<{ item: CommentItem; needs_review: boolean }>(response);
}

export async function fetchCommentFeed(
    limit: number,
    random: boolean,
): Promise<ApiResult<{ items: CommentItem[] }>> {
    const url = new URL('/api/comments/feed', window.location.origin);
    url.searchParams.set('limit', String(limit));
    url.searchParams.set('random', random ? 'true' : 'false');

    const response = await fetch(url.toString(), { cache: 'no-store', credentials: 'include' }).catch(() => null);
    if (!response) {
        return { ok: false, message: '评论服务暂不可用' };
    }
    return parseResponse<{ items: CommentItem[] }>(response);
}

export async function fetchPendingComments(): Promise<ApiResult<{ items: CommentItem[] }>> {
    const response = await fetch('/api/comments/moderation', {
        cache: 'no-store',
        credentials: 'include',
    }).catch(() => null);
    if (!response) {
        return { ok: false, message: '评论服务暂不可用' };
    }
    return parseResponse<{ items: CommentItem[] }>(response);
}

export async function moderateComment(
    commentId: number,
    action: 'approve' | 'reject',
): Promise<ApiResult<{ item: CommentItem }>> {
    const response = await fetch(`/api/comments/${commentId}/moderation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        cache: 'no-store',
        credentials: 'include',
    }).catch(() => null);
    if (!response) {
        return { ok: false, message: '评论服务暂不可用' };
    }
    return parseResponse<{ item: CommentItem }>(response);
}
