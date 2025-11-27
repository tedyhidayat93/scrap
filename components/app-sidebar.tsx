// components/app-sidebar.tsx
"use client"

import { NavMain } from "@/components/nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavHistories } from "./nav-histories"
import { navbar } from "@/constant/navbar"
import { useSearchHistory } from "@/context/search-history-context"
import { History } from "@/interfaces/history"
import {QueryType } from "@/interfaces/global"
import { useRouter } from "next/navigation"

const data = {
  navMain: navbar
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  onHistorySelect?: (query: string, platform: string, type: QueryType) => void;
}

export function AppSidebar({ onHistorySelect, ...props }: AppSidebarProps) {
  const { histories, removeHistory } = useSearchHistory()
  const router = useRouter()

  const handleHistorySelect = (history: any) => {
    if (onHistorySelect) {
      onHistorySelect(history.query, history.platform, history.type as QueryType)
    }
    
    // Close sidebar on mobile after selection
    const sidebar = document.querySelector('[data-state="open"]')
    if (window.innerWidth < 768 && sidebar) {
      const closeButton = sidebar.querySelector('button[aria-label="Close sidebar"]') as HTMLButtonElement
      closeButton?.click()
    }
  }

  return (
    <Sidebar className="border-r-0" {...props}>
      <SidebarHeader>
        <div className="space-y-1 pb-4 pt-3 px-3">
          <h1 className="font-bold text-glow-primary m-0 text-base text-glow-intense">SOCIAL MEDIA ANALYTICS</h1>
          {/* <small className="text-xs text-muted-foreground">Scrape Comments</small> */}
        </div>
        <NavMain items={data.navMain} />
      </SidebarHeader>
      <SidebarContent>
        <NavHistories 
          histories={histories}
          onSelect={handleHistorySelect}
          onDelete={removeHistory}
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}