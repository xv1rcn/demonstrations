import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, AUTH_USER_ID_COOKIE_NAME, getBackendApiUrl } from '@/lib/auth';

function getAuthUserId(cookieStore: Awaited<ReturnType<typeof cookies>>): string | null {
    const isAuthed = cookieStore.get(AUTH_COOKIE_NAME)?.value === 'authenticated';
    const userId = cookieStore.get(AUTH_USER_ID_COOKIE_NAME)?.value ?? '';
    if (!isAuthed || !/^\d+$/.test(userId)) return null;
    return userId;
}

export async function POST(request: Request) {
    const cookieStore = await cookies();
    const userId = getAuthUserId(cookieStore);
    if (!userId) {
        return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
        return NextResponse.json({ message: '头像上传参数异常' }, { status: 400 });
    }

    const avatar = formData.get('avatar');
    if (!(avatar instanceof File)) {
        return NextResponse.json({ message: '缺少头像文件字段 avatar' }, { status: 400 });
    }

    const upstreamForm = new FormData();
    upstreamForm.append('avatar', avatar, avatar.name);

    const upstream = await fetch(getBackendApiUrl('/users/me/avatar'), {
        method: 'POST',
        headers: {
            'X-User-Id': userId,
        },
        body: upstreamForm,
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '用户服务暂不可用' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}
