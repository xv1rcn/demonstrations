"use client"

import * as React from "react"
import {
    Apple,
    Atom,
    HeartHandshake,
    Lightbulb,
    Send,
    Zap,
} from "lucide-react"

import {NavMain} from "@/components/nav-main"
import {NavSecondary} from "@/components/nav-secondary"
import {NavUser} from "@/components/nav-user"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
    user: {
        name: "琥珀色的月",
        email: "i@xv1r.cn",
        avatar: "/avatars/avatar.png",
    },
    navMain: [
        {
            title: "力学",
            url: "#",
            icon: Apple,
        },
        {
            title: "电学",
            url: "#",
            icon: Zap,
        },
        {
            title: "光学",
            url: "#",
            icon: Lightbulb,
            items: [
                {
                    title: "光的干涉",
                    url: "#",
                },
            ],
        },
    ],
    navSecondary: [
        {
            title: "帮助中心",
            url: "#",
            icon: HeartHandshake,
        },
        {
            title: "问题反馈",
            url: "#",
            icon: Send,
        },
    ],
}

export function AppSidebar({...props}: React.ComponentProps<typeof Sidebar>) {
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <a href="#">
                                <div
                                    className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                                    <Atom className="size-5"/>
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">物理科普仿真实验平台</span>
                                    <span className="truncate text-xs">Dev 20250325</span>
                                </div>
                            </a>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <NavMain items={data.navMain}/>
                <NavSecondary items={data.navSecondary} className="mt-auto"/>
            </SidebarContent>
            <SidebarFooter>
                <NavUser user={data.user}/>
            </SidebarFooter>
        </Sidebar>
    )
}
