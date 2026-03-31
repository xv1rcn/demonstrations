export type RecentLessonVideoItem = {
    href: string;
    label: string;
};

export const RECENT_LESSON_VIDEO_STORAGE_KEY = "recent_lesson_videos";
const MAX_RECENT_LESSON_VIDEOS = 8;

function parseStoredValue(value: string | null): RecentLessonVideoItem[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is RecentLessonVideoItem => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as { href?: unknown; label?: unknown };
            return typeof candidate.href === "string" && typeof candidate.label === "string";
        });
    } catch {
        return [];
    }
}

export function getRecentLessonVideos(): RecentLessonVideoItem[] {
    if (typeof window === "undefined") return [];
    return parseStoredValue(window.localStorage.getItem(RECENT_LESSON_VIDEO_STORAGE_KEY)).slice(
        0,
        MAX_RECENT_LESSON_VIDEOS
    );
}

export function persistRecentLessonVideos(videos: RecentLessonVideoItem[]): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(RECENT_LESSON_VIDEO_STORAGE_KEY, JSON.stringify(videos));
    } catch {
        // ignore failures writing to storage
    }
}

export function addRecentLessonVideo(video: RecentLessonVideoItem): void {
    if (typeof window === "undefined") return;
    const current = getRecentLessonVideos();
    const next = [video, ...current.filter((item) => item.href !== video.href)].slice(
        0,
        MAX_RECENT_LESSON_VIDEOS
    );
    persistRecentLessonVideos(next);
}

export function removeRecentLessonVideo(href: string): RecentLessonVideoItem[] {
    if (typeof window === "undefined") return [];
    const current = getRecentLessonVideos();
    const next = current.filter((item) => item.href !== href);
    persistRecentLessonVideos(next);
    return next;
}
