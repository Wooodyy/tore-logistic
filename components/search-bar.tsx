"use client"

import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface SearchBarProps {
  onSearch: (query: string) => void
  searchQuery: string
}

export default function SearchBar({ onSearch, searchQuery }: SearchBarProps) {
  return (
    <div className="relative space-y-3">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <Input
          placeholder="Поиск по номеру заказа или контейнеру..."
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:ring-0 text-slate-900 placeholder-slate-400 transition-all shadow-sm hover:border-slate-300 bg-white"
        />
      </div>
      {searchQuery && <p className="text-xs text-slate-500 ml-1 font-500 animate-pulse">Поиск в реальном времени...</p>}
    </div>
  )
}
