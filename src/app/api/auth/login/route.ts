import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_USER_ID_COOKIE_NAME, getBackendBaseUrl } from '@/lib/auth';

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);

    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!username || !password) {
        return NextResponse.json({ message: '用户名或密码错误' }, { status: 401 });
    }

    const backendBaseUrl = getBackendBaseUrl();

    const upstream = await fetch(`${backendBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '登录服务暂不可用，请稍后重试' }, { status: 503 });
    }

    if (!upstream.ok) {
        const data = (await upstream.json().catch(() => null)) as { message?: string } | null;
        const status = upstream.status === 403 ? 403 : 401;
        return NextResponse.json({ message: data?.message ?? '用户名或密码错误' }, { status });
    }

    const data = (await upstream.json().catch(() => null)) as { ok?: boolean; user?: { id?: number } } | null;
    const userId = data?.user?.id;
    if (!userId) {
        return NextResponse.json({ message: '登录服务返回异常' }, { status: 502 });
    }

    const response = NextResponse.json({ ok: true, user: data?.user ?? null });
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: 'authenticated',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
    });
    response.cookies.set({
        name: AUTH_USER_ID_COOKIE_NAME,
        value: String(userId),
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 60 * 60 * 8,
    });

    return response;
}
