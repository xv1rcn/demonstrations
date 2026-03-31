"use client";

import * as React from "react";
import { Box } from "@mui/material";
import LessonPageTemplate from "@/components/lesson-page-template";
import type { SimulationNavItem } from "@/lib/simulations-nav";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";
const LESSON_VIDEO = `${VIDEO_BASE}${encodeURIComponent("光的干涉与衍射.mp4")}`;

const diffractionExperiments: SimulationNavItem[] = [
    { href: "double-slit", label: "① 杨氏双缝干涉" },
    { href: "single-slit", label: "② 单缝衍射" },
    { href: "grating-diffraction", label: "③ 平面光栅衍射" },
];

export default function InterferenceLessonPage() {
    return (
        <Box className="min-h-screen w-full" sx={{ backgroundColor: "background.default" }}>
            <LessonPageTemplate
                videoUrl={LESSON_VIDEO}
                experiments={diffractionExperiments}
            />
        </Box>
    );
}
