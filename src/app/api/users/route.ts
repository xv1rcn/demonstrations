import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    AUTH_COOKIE_NAME,
    AUTH_USER_ID_COOKIE_NAME,
    getBackendApiUrl,
} from '@/lib/auth';

function getAuthUserId(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
    const isAuthed = cookieStore.get(AUTH_COOKIE_NAME)?.value === 'authenticated';
    const userId = cookieStore.get(AUTH_USER_ID_COOKIE_NAME)?.value ?? '';
    if (!isAuthed || !/^\d+$/.test(userId)) return null;
    return userId;
}

export async function GET(request: Request) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    // 获取查询参数
    const url = new URL(request.url);
    const includeDeleted = url.searchParams.get('include_deleted');

    const backendUrl = new URL(getBackendApiUrl('/users'));
    if (includeDeleted) {
        backendUrl.searchParams.set('include_deleted', includeDeleted);
    }

    const upstream = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers: {
            'X-User-Id': userId,
        },
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '用户服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}
