import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
    AUTH_COOKIE_NAME,
    AUTH_USER_ID_COOKIE_NAME,
    getBackendApiUrl,
} from '@/lib/auth';

export async function PUT(request: Request) {
    const cookieStore = await cookies();
    const isAuthed = cookieStore.get(AUTH_COOKIE_NAME)?.value === 'authenticated';
    const userId = cookieStore.get(AUTH_USER_ID_COOKIE_NAME)?.value ?? '';

    if (!isAuthed || !/^\d+$/.test(userId)) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const upstream = await fetch(getBackendApiUrl('/users/me/password'), {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-User-Id': userId,
        },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '用户服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}
