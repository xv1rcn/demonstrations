"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lesson/optical-instruments",
    label: "❺ 光学仪嚣",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光学仪器.mp4")}`,
};

const opticalInstrumentExperiments: SimulationNavItem[] = [
    {
        href: "convex-lens",
        label: "⑬ 凸透镜成像",
    },
    {
        href: "microscope",
        label: "⑭ 显微镜成像",
    },
    {
        href: "telescope-magnification",
        label: "⑮ 望远镜倍率",
    },
];

export default function OpticalInstrumentsLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate video={LESSON_VIDEO_META} experiments={opticalInstrumentExperiments} />
        </Box>
    );
}
