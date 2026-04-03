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

    const incoming = new URL(request.url);
    const backendUrl = new URL(getBackendApiUrl('/comments'));
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

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const upstream = await fetch(getBackendApiUrl('/comments'), {
        method: 'POST',
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
