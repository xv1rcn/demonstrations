"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lesson/photoelectric",
    label: "❻ 光电效应",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光电效应.mp4")}`,
};

const photoelectricExperiments: SimulationNavItem[] = [
    {
        href: "photoelectric",
        label: "⑯ 光电效应・光电子动能",
    },
    {
        href: "stopping-voltage",
        label: "⑰ 遏止电压",
    },
    {
        href: "photo-current-intensity",
        label: "⑱ 光电流与光强",
    },
];

export default function PhotoelectricLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate video={LESSON_VIDEO_META} experiments={photoelectricExperiments} />
        </Box>
    );
}
