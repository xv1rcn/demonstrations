import { NextResponse } from 'next/server';
import { getBackendBaseUrl } from '@/lib/auth';

export async function POST(request: Request) {
    const body = await request.json().catch(() => null);

    const upstream = await fetch(`${getBackendBaseUrl()}/api/auth/register`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body ?? {}),
        cache: 'no-store',
    }).catch(() => null);

    if (!upstream) {
        return NextResponse.json({ message: '注册服务暂不可用，请稍后重试' }, { status: 503 });
    }

    const data = (await upstream.json().catch(() => null)) as unknown;
    return NextResponse.json(data, { status: upstream.status });
}
