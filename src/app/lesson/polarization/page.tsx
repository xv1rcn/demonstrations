"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lesson/polarization",
    label: "❷ 光的偏振",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光的偏振.mp4")}`,
};

const polarizationExperiments: SimulationNavItem[] = [
    {
        href: "polarization",
        label: "④ 偏振片・马吕斯定律",
    },
    {
        href: "brewster-angle",
        label: "⑤ 布儒斯特角・反射偏振",
    },
    {
        href: "polarization-3d",
        label: "⑥ 3D 眼镜偏振分离",
    },
];

export default function PolarizationLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate
                video={LESSON_VIDEO_META}
                experiments={polarizationExperiments}
            />
        </Box>
    );
}
