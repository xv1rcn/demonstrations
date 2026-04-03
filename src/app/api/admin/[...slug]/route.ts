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

export async function PATCH(request: Request, { params }: RouteParams) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const { slug } = await params;
    if (slug.length < 2 || slug[0] !== 'users') {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const targetUserId = slug[1];
    const body = await request.json().catch(() => null);

    const upstream = await fetch(getBackendApiUrl(`/admin/users/${targetUserId}`), {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '用户服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}

export async function PUT(request: Request, { params }: RouteParams) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const { slug } = await params;
    if (slug.length < 3 || slug[0] !== 'users' || slug[2] !== 'password') {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const targetUserId = slug[1];
    const body = await request.json().catch(() => null);

    const upstream = await fetch(getBackendApiUrl(`/admin/users/${targetUserId}/password`), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '用户服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}

export async function DELETE(request: Request, { params }: RouteParams) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const { slug } = await params;
    if (slug.length < 2 || slug[0] !== 'users') {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const targetUserId = slug[1];

    const upstream = await fetch(getBackendApiUrl(`/admin/users/${targetUserId}`), {
        method: 'DELETE',
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

export async function POST(request: Request, { params }: RouteParams) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const { slug } = await params;
    if (slug.length < 3 || slug[0] !== 'users' || slug[2] !== 'restore') {
        return NextResponse.json({ message: '不存在的路由' }, { status: 404 });
    }

    const targetUserId = slug[1];

    const upstream = await fetch(getBackendApiUrl(`/admin/users/${targetUserId}/restore`), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
