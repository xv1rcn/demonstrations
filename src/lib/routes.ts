export const DASHBOARD_ROUTE = "/dashboard";
export const ADMIN_ROUTE = "/admin";
export const SIMULATIONS_ROUTE = "/simulations";
export const LESSONS_ROUTE = "/lessons";

export function buildEmbedUrl(base: string): string {
    return `${base}${base.includes("?") ? "&" : "?"}embed=1`;
}

export function buildSimulationUrl(href: string): string {
    return `${SIMULATIONS_ROUTE}/${href}`;
}
