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

interface RouteParams {
    params: Promise<{
        slug: string[];
    }>;
}

export async function GET(request: Request, { params }: RouteParams) {
    const { slug } = await params;
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);

    if (slug[0] !== 'feed' && slug[0] !== 'moderation') {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const incoming = new URL(request.url);
    const backendPath = slug[0] === 'feed' ? '/comments/feed' : '/comments/moderation';
    const backendUrl = new URL(getBackendApiUrl(backendPath));
    incoming.searchParams.forEach((value, key) => {
        backendUrl.searchParams.set(key, value);
    });

    const headers: Record<string, string> = {};
    if (userId) {
        headers['X-User-Id'] = userId;
    }

    const upstream = await fetch(backendUrl.toString(), {
        method: 'GET',
        headers,
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '评论服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}

export async function PATCH(request: Request, { params }: RouteParams) {
    const { slug } = await params;
    if (slug.length !== 2 || slug[1] !== 'moderation' || !/^\d+$/.test(slug[0])) {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const commentId = slug[0];
    const body = await request.json().catch(() => null);
    const upstream = await fetch(getBackendApiUrl(`/comments/${commentId}/moderation`), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '评论服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
    const { slug } = await params;
    if (slug.length !== 1 || !/^\d+$/.test(slug[0])) {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const commentId = slug[0];
    const upstream = await fetch(getBackendApiUrl(`/comments/${commentId}`), {
        method: 'DELETE',
        headers: {
            'X-User-Id': userId,
        },
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '评论服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}
