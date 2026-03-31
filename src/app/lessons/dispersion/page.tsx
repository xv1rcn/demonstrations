"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lessons/dispersion",
    label: "❹ 光的色散",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光的色散.mp4")}`,
};

const dispersionExperiments: SimulationNavItem[] = [
    {
        href: "prism-dispersion",
        label: "⑩ 三棱镜色散",
    },
    {
        href: "rainbow",
        label: "⑪ 彩虹水滴折射",
    },
    {
        href: "lens-chromatic",
        label: "⑫ 透镜色差",
    },
];

export default function DispersionLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate video={LESSON_VIDEO_META} experiments={dispersionExperiments} />
        </Box>
    );
}
