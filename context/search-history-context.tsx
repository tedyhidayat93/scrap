// src/contexts/search-history-context.tsx
"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { History } from "@/interfaces/history"
import { mockHistories } from "@/data"

interface SearchHistoryContextType {
  histories: History[]
  addHistory: (history: Omit<History, "id">) => void
  removeHistory: (id: string | number) => void
}

const SearchHistoryContext = createContext<SearchHistoryContextType | undefined>(undefined)

export function SearchHistoryProvider({ children }: { children: ReactNode }) {
  const [histories, setHistories] = useState<History[]>([])
  const [isMounted, setIsMounted] = useState(false)

  // Set mounted state to true after component mounts (client-side only)
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Load from localStorage on mount (client-side only)
  useEffect(() => {
    if (isMounted) {
      const saved = localStorage.getItem('searchHistories')
      setHistories(saved ? JSON.parse(saved) : mockHistories)
    }
  }, [isMounted])

  // Save to localStorage when histories change (client-side only)
  useEffect(() => {
    if (isMounted && histories.length > 0) {
      localStorage.setItem('searchHistories', JSON.stringify(histories))
    }
  }, [histories, isMounted])

  const addHistory = (history: Omit<History, "id">) => {
    if (!isMounted) return;
    
    const newHistory = {
      ...history,
      id: Math.floor(Math.random() * 900000) + 100000
    }
    setHistories(prev => [newHistory, ...prev].slice(0, 20))
  }

  const removeHistory = (id: string | number) => {
    if (!isMounted) return;
    setHistories(prev => prev.filter(item => item.id.toString() !== id.toString()))
  }

  return (
    <SearchHistoryContext.Provider value={{ 
      histories: isMounted ? histories : [], 
      addHistory, 
      removeHistory 
    }}>
      {children}
    </SearchHistoryContext.Provider>
  )
}

export function useSearchHistory() {
  const context = useContext(SearchHistoryContext)
  if (context === undefined) {
    throw new Error('useSearchHistory must be used within a SearchHistoryProvider')
  }
  return context
}