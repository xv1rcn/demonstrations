import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_USER_ID_COOKIE_NAME, getBackendBaseUrl } from '@/lib/auth';

export async function POST() {
    await fetch(`${getBackendBaseUrl()}/api/auth/logout`, {
        method: 'POST',
        cache: 'no-store',
    }).catch(() => null);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
        name: AUTH_COOKIE_NAME,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    response.cookies.set({
        name: AUTH_USER_ID_COOKIE_NAME,
        value: '',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: 0,
    });
    return response;
}
