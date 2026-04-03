export type AdminUser = {
    id: number;
    username: string;
    email: string;
    nickname: string;
    avatar_url: string | null;
    role: 'student' | 'teacher' | 'admin';
    status: 'active' | 'disabled';
    created_at: string;
    updated_at: string;
    password_updated_at: string;
    deleted_at: string | null;
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

export async function fetchAdminUsers(includeDeleted: boolean = false): Promise<ApiResult<{ items: AdminUser[] }>> {
    const url = new URL('/api/users', window.location.origin);
    if (includeDeleted) {
        url.searchParams.set('include_deleted', 'true');
    }
    const response = await fetch(url.toString(), { 
        cache: 'no-store',
        credentials: 'include',
    }).catch(() => null);
    if (!response) {
        return {
            ok: false,
            message: '网络连接失败',
        };
    }
    return parseResponse<{ items: AdminUser[] }>(response);
}

export type UpdateUserPayload = {
    email?: string;
    nickname?: string;
    role?: string;
    status?: string;
};

export async function updateAdminUser(userId: number, payload: UpdateUserPayload): Promise<ApiResult<AdminUser>> {
    const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        cache: 'no-store',
        credentials: 'include',
    }).catch(() => null);
    if (!response) {
        return {
            ok: false,
            message: '网络连接失败',
        };
    }
    return parseResponse<AdminUser>(response);
}

export async function resetAdminUserPassword(userId: number, newPassword: string): Promise<ApiResult<{ message: string }>> {
    const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
        credentials: 'include',
        cache: 'no-store',
    }).catch(() => null);
    if (!response) {
        return {
            ok: false,
            message: '网络连接失败',
        };
    }
    return parseResponse<{ message: string }>(response);
}

export async function softDeleteAdminUser(userId: number): Promise<ApiResult<{ message: string }>> {
    const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include',
        cache: 'no-store',
    }).catch(() => null);
    if (!response) {
        return {
            ok: false,
            message: '网络连接失败',
        };
    }
    return parseResponse<{ message: string }>(response);
}

export async function restoreAdminUser(userId: number): Promise<ApiResult<AdminUser>> {
    const response = await fetch(`/api/admin/users/${userId}/restore`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
    }).catch(() => null);
    if (!response) {
        return {
            ok: false,
            message: '网络连接失败',
        };
    }
    return parseResponse<AdminUser>(response);
}
