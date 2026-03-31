"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate, { type LessonVideoMeta } from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO_META: LessonVideoMeta = {
    href: "/lessons/interference",
    label: "❶ 光的干涉和衍射",
    videoUrl: `${VIDEO_BASE}${encodeURIComponent("光的干涉与衍射.mp4")}`,
};

const diffractionExperiments: SimulationNavItem[] = [
    { href: "double-slit", label: "① 杨氏双缝干涉" },
    { href: "single-slit", label: "② 单缝衍射" },
    { href: "grating-diffraction", label: "③ 平面光栅衍射" },
];

export default function InterferenceLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate
                video={LESSON_VIDEO_META}
                experiments={diffractionExperiments}
            />
        </Box>
    );
}
