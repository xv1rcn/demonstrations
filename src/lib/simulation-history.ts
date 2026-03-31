export const RECENT_SIMULATION_HREFS_KEY = "recent_simulation_hrefs";
const MAX_RECENT_SIMULATION_HREFS = 8;

type StoredSimulationHref = string;

function parseStoredSimulationHrefs(value: string | null): StoredSimulationHref[] {
    if (!value) return [];
    try {
        const parsed = JSON.parse(value) as unknown;
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is StoredSimulationHref => typeof item === "string");
    } catch {
        return [];
    }
}

export function getRecentSimulationHrefs(): string[] {
    if (typeof window === "undefined") return [];
    return parseStoredSimulationHrefs(window.localStorage.getItem(RECENT_SIMULATION_HREFS_KEY)).slice(
        0,
        MAX_RECENT_SIMULATION_HREFS
    );
}

export function persistRecentSimulationHrefs(hrefs: string[]): void {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(RECENT_SIMULATION_HREFS_KEY, JSON.stringify(hrefs));
    } catch {
        // ignore
    }
}

export function addRecentSimulationHref(href: string): string[] {
    if (typeof window === "undefined") return [];
    const current = getRecentSimulationHrefs();
    const next = [href, ...current.filter((item) => item !== href)].slice(
        0,
        MAX_RECENT_SIMULATION_HREFS
    );
    persistRecentSimulationHrefs(next);
    return next;
}

export function removeRecentSimulationHref(href: string): string[] {
    if (typeof window === "undefined") return [];
    const current = getRecentSimulationHrefs();
    const next = current.filter((item) => item !== href);
    persistRecentSimulationHrefs(next);
    return next;
}
