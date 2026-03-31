export type SimulationNavItem = {
    href: string;
    label: string;
};

export type SimulationNavGroup = {
    title: string;
    members: SimulationNavItem[];
};

export const NAV_GROUPS: SimulationNavGroup[] = [
    {
        title: "波动与偏振",
        members: [
            { href: "double-slit", label: "① 杨氏双缝干涉" },
            { href: "single-slit", label: "② 单缝衍射" },
            { href: "grating-diffraction", label: "③ 平面光栅衍射" },
            { href: "wedge-interference", label: "Ⓐ 劈尖干涉" },
            { href: "newton-rings", label: "Ⓑ 牛顿环" },
            { href: "polarization", label: "④ 偏振片・马吕斯定律" },
            { href: "brewster-angle", label: "⑤ 布儒斯特角・反射偏振" },
            { href: "polarization-3d", label: "⑥ 3D 眼镜偏振分离" },
        ],
    },
    {
        title: "折射与成像",
        members: [
            { href: "critical-angle", label: "⑦ 全反射临界角" },
            { href: "fiber-total-internal-reflection", label: "⑧ 光纤全反射" },
            { href: "bubble-total-internal-reflection", label: "⑨ 水中气泡全反射" },
            { href: "prism-dispersion", label: "⑩ 三棱镜色散" },
            { href: "rainbow", label: "⑪ 彩虹水滴折射" },
            { href: "lens-chromatic", label: "⑫ 透镜色差" },
            { href: "convex-lens", label: "⑬ 凸透镜成像" },
            { href: "microscope", label: "⑭ 显微镜成像" },
            { href: "telescope-magnification", label: "⑮ 望远镜倍率" },
        ],
    },
    {
        title: "光电效应",
        members: [
            { href: "photoelectric", label: "⑯ 光电效应・光电子动能" },
            { href: "stopping-voltage", label: "⑰ 遏止电压" },
            { href: "photo-current-intensity", label: "⑱ 光电流与光强" },
        ],
    },
    {
        title: "现代光学与光通信",
        members: [
            { href: "optical-doppler", label: "⑲ 光的多普勒效应" },
            { href: "beer-lambert", label: "⑳ 光的吸收定律" },
            { href: "fiber-loss", label: "㉑ 光纤损耗・长距离通信" },
            { href: "rayleigh-scattering", label: "㉒ 瑞利散射" },
            { href: "laser-longitudinal-mode", label: "㉓ 激光谐振腔纵模" },
        ],
    },
];

export function openSimulation(item: SimulationNavItem) {
    if (typeof window === "undefined") {
        return;
    }
    const payload = { type: "simulation:open", href: item.href, label: item.label };
    if (window.parent !== window) {
        window.parent.postMessage(payload, window.location.origin);
        return;
    }
    window.location.assign(`/simulations/${item.href}`);
}
