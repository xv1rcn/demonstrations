"use client";

import * as React from "react";
import Script from "next/script";
import { Box, MenuItem, Select, SelectChangeEvent } from "@mui/material";

const VIDEO_BASE = "https://ruyugao.cn/static/videos/";

const SAMPLE_VIDEOS = [
    "光学仪器.mp4",
    "光电效应.mp4",
    "光的偏振.mp4",
    "光的全反射.mp4",
    "光的干涉与衍射.mp4",
    "光的色散.mp4",
];

const PLYR_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.min.js";
const PLYR_STYLE_HREF = "https://cdn.jsdelivr.net/npm/plyr@3.7.8/dist/plyr.css";

declare global {
    interface Window {
        Plyr?: new (el: Element, options?: Record<string, unknown>) => PlyrInstance;
    }
}

interface PlyrSource {
    type: string;
    sources: Array<{ src: string; type: string }>;
}

interface PlyrInstance {
    destroy?: () => void;
    source?: PlyrSource;
    play?: () => Promise<void>;
}

export default function LessonPage() {
    const [selected, setSelected] = React.useState<string>(SAMPLE_VIDEOS[0]);
    const [scriptReady, setScriptReady] = React.useState(false);
    const playerRef = React.useRef<PlyrInstance | null>(null);
    const videoElRef = React.useRef<HTMLVideoElement | null>(null);

    const handleSelect = (e: SelectChangeEvent<string>) => {
        setSelected(e.target.value as string);
    };

    const src = VIDEO_BASE + encodeURIComponent(selected);

    React.useEffect(() => {
        if (!scriptReady || !window.Plyr) return;

        try {
            playerRef.current?.destroy?.();
        } catch {}

        if (videoElRef.current) {
            playerRef.current = new window.Plyr(videoElRef.current, {
                controls: ["play-large", "play", "progress", "current-time", "mute", "volume", "settings", "fullscreen"],
                seekTime: 5,
            });
        }

        return () => {
            try {
                playerRef.current?.destroy?.();
                playerRef.current = null;
            } catch {}
        };
    }, [scriptReady]);

    React.useEffect(() => {
        const p = playerRef.current;
        if (p && typeof p.source !== "undefined") {
            try {
                p.source = { type: "video", sources: [{ src, type: "video/mp4" }] };
                p.play?.().catch(() => {});
            } catch {
                if (videoElRef.current) {
                    videoElRef.current.src = src;
                    videoElRef.current.load();
                    videoElRef.current.play().catch(() => {});
                }
            }
        } else if (videoElRef.current) {
            videoElRef.current.src = src;
            videoElRef.current.load();
            videoElRef.current.play().catch(() => {});
        }
    }, [src]);

    return (
        <Box sx={{ p: 3 }}>
            <link rel="stylesheet" href={PLYR_STYLE_HREF} />
            <Script src={PLYR_SCRIPT_SRC} strategy="afterInteractive" onLoad={() => setScriptReady(true)} />

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 1 }}>
                <video
                    ref={videoElRef}
                    id="lesson-player"
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 640, backgroundColor: "#000" }}
                >
                    <source src={src} type="video/mp4" />
                    您的浏览器不支持 video 标签。
                </video>
            </Box>

            <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2, flexWrap: "wrap" }}>
                <Select value={selected} onChange={handleSelect} size="small" sx={{ minWidth: 220 }}>
                    {SAMPLE_VIDEOS.map((v) => (
                        <MenuItem key={v} value={v}>{v}</MenuItem>
                    ))}
                </Select>
            </Box>
        </Box>
    );
}

