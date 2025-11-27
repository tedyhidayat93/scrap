"use client"

import { ArrowUpRight, History as HistoryIcon, MessageSquare, MoreHorizontal, Search, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { formatDistanceToNow } from "date-fns"
import { NavHistoriesProps } from "@/interfaces/history"
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { Separator } from "./ui/separator"


export function NavHistories({ histories, onSelect, onDelete }: NavHistoriesProps) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('');

  const filteredHistories = useMemo(() => {
    if (!searchTerm.trim()) return histories;
    return histories.filter(history => 
      history.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      history.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      history.platform.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [histories, searchTerm]);

  
  return (
    <div className="space-y-4">
      <div className="px-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-xs text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search history..."
            className="w-full bg-background pl-8 text-xs"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="sticky bg-background top-0 z-30">
        Search Histories
        <span className="ml-2 text-xs text-muted-foreground">

        </span>
      </SidebarGroupLabel>
      
      {filteredHistories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="bg-muted rounded-full p-4 mb-4">
            <HistoryIcon className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium mb-1">
            {searchTerm ? 'No matching history found' : 'No search history yet'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {searchTerm 
              ? 'Try a different search term' 
              : 'Your search history will appear here'}
          </p>
          {!searchTerm && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="mt-4 text-foreground"
              onClick={() => {
                // Optional: Add a way to trigger a new search
                const searchInput = document.querySelector('input[type="search"]') as HTMLInputElement;
                if (searchInput) searchInput.focus();
              }}
            >
              Start a new search
            </Button>
          )}
        </div>
      ) : (
        <SidebarMenu className="max-h-xl overflow-y-auto">
          {filteredHistories.slice(0, 30).map((query) => (
            <SidebarMenuItem key={query.id}>
              <SidebarMenuButton 
                onClick={() => onSelect(query)}
                className="text-left shimmer-effect text-xs cursor-pointer py-6 border-b border-border rounded-none"
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-muted">
                    <HistoryIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between max-w-full">
                      <p className="line-clamp-1 truncate font-medium flex-1 max-w-32">{query.query}</p>
                      <span className="text-[10px] text-muted-foreground ml-2 whitespace-nowrap">
                        {query.platform}
                      </span>
                    </div>
                    <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground">
                      <p className="line-clamp-1">
                        Search: {query.type}
                      </p>
                      <span className="ml-2 whitespace-nowrap">
                        {formatDistanceToNow(new Date(query.datetime), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </div>
              </SidebarMenuButton>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuAction>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">More</span>
                  </SidebarMenuAction>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg"
                  side={isMobile ? "bottom" : "right"}
                  align={isMobile ? "end" : "start"}
                >
                  <DropdownMenuItem onClick={() => onDelete(query.id)}>
                    <Trash2 className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      const url = `#query-${query.id}`
                      window.open(url, '_blank')
                    }}
                  >
                    <ArrowUpRight className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>Open in New Tab</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      )}
    </SidebarGroup>
  </div>
)}