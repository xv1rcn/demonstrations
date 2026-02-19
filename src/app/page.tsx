'use client';

import * as React from "react";
import {Card, CardContent, Divider, Link, MenuItem, MenuList, Typography} from "@mui/material";

type NavItem = {
    href: string;
    label: string;
};

type NavGroup = {
    title: string;
    members: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
    {
        title: '波动与偏振',
        members: [
            {href: 'double-slit', label: '① 杨氏双缝干涉'},
            {href: 'single-slit', label: '② 单缝衍射'},
            {href: 'grating-diffraction', label: '③ 平面光栅衍射'},
            {href: 'polarization', label: '④ 偏振片・马吕斯定律'},
            {href: 'brewster', label: '⑤ 布儒斯特角・反射偏振'},
            {href: 'polarization-3d', label: '⑥ 3D 眼镜偏振分离'},
        ],
    },
    {
        title: '折射与成像',
        members: [
            {href: 'critical-angle', label: '⑦ 全反射临界角'},
            {href: 'fiber-tir', label: '⑧ 光纤全反射'},
            {href: 'bubble-tir', label: '⑨ 水中气泡全反射'},
            {href: 'prism-dispersion', label: '⑩ 三棱镜色散'},
            {href: 'rainbow', label: '⑪ 彩虹水滴折射'},
            {href: 'lens-chromatic', label: '⑫ 透镜色差'},
            {href: 'convex-lens', label: '⑬ 凸透镜成像'},
            {href: 'microscope', label: '⑭ 显微镜成像'},
            {href: 'telescope-magnification', label: '⑮ 望远镜倍率'},
        ],
    },
    {
        title: '光电效应',
        members: [
            {href: 'photoelectric', label: '⑯ 光电效应・光电子动能'},
            {href: 'stopping-voltage', label: '⑰ 遏止电压'},
            {href: 'photo-current-intensity', label: '⑱ 光电流与光强'},
        ],
    },
    {
        title: '其他',
        members: [
            {href: 'wedge', label: 'Ⓐ 劈尖干涉'},
            {href: 'newton', label: 'Ⓑ 牛顿环'},
        ],
    },
];

export default function Page() {
    return (
        <div className="flex items-center justify-center h-screen">
            <Card className="max-h-[90vh] overflow-hidden">
                <CardContent className="flex flex-row">
                    <div className="w-[30rem] max-h-[82vh] overflow-y-auto pr-1">
                        {NAV_GROUPS.map(({title, members}, groupIdx) => (
                            <React.Fragment key={title}>
                                <Typography variant="subtitle2" color="text.secondary" className="px-4 pt-1 pb-1">
                                    {title}
                                </Typography>
                                <MenuList dense>
                                    {members.map((item) => (
                                        <MenuItem key={item.href}>
                                            <Link href={item.href} underline="hover">
                                                <Typography>{item.label}</Typography>
                                            </Link>
                                        </MenuItem>
                                    ))}
                                </MenuList>
                                {groupIdx < NAV_GROUPS.length - 1 && <Divider className="my-1"/>}
                            </React.Fragment>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
