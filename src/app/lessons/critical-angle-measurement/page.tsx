"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lessons/critical-angle-measurement",
    label: "❸ 全反射角的测量",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光的全反射.mp4")}`,
};

const criticalAngleExperiments: SimulationNavItem[] = [
    {
        href: "critical-angle",
        label: "⑦ 全反射临界角",
    },
    {
        href: "fiber-total-internal-reflection",
        label: "⑧ 光纤全反射",
    },
    {
        href: "bubble-total-internal-reflection",
        label: "⑨ 水中气泡全反射",
    },
];

export default function CriticalAngleMeasurementLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate video={LESSON_VIDEO_META} experiments={criticalAngleExperiments} />
        </Box>
    );
}
