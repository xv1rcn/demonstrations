import { cookies } from 'next/headers';

export const AUTH_COOKIE_NAME = 'demo_auth_session';
export const AUTH_USER_ID_COOKIE_NAME = 'demo_auth_user_id';

export function getBackendBaseUrl(): string {
    return 'http://127.0.0.1:5000';
}

export function getBackendApiUrl(path: string): string {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    return `${getBackendBaseUrl()}/api${normalized}`;
}

export async function isAuthenticated(): Promise<boolean> {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    return token === 'authenticated';
}
