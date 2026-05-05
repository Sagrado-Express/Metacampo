'use client'

import { useState, useEffect } from 'react'
import { MapPin, Clock, Send, WifiOff } from 'lucide-react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function CheckInCard() {
  const [note, setNote] = useState('')
  const [isOffline, setIsOffline] = useState(false)
  const [lastCheckIn, setLastCheckIn] = useState<string | null>(null)

  useEffect(() => {
    setIsOffline(!navigator.onLine)
    const handleStatus = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleStatus)
    window.addEventListener('offline', handleStatus)
    return () => {
      window.removeEventListener('online', handleStatus)
      window.removeEventListener('offline', handleStatus)
    }
  }, [])

  const handleCheckIn = () => {
    if (!note.trim()) return
    const timestamp = new Date().toLocaleString()
    setLastCheckIn(timestamp)
    
    // In a real app, this would be saved to IndexedDB/LocalStorage
    console.log('Check-in recorded:', { timestamp, note })
    setNote('')
  }

  return (
    <div className="glass-card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="text-accent" size={20} />
          <h3 className="text-lg font-bold">Check-in de Campo</h3>
        </div>
        {isOffline && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-warning uppercase tracking-widest animate-pulse">
            <WifiOff size={12} /> Offline Mode
          </div>
        )}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Notas da visita (ex: Área confirmada, produtor interessado...)"
        className="w-full h-24 p-3 bg-muted/50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none transition-all"
      />

      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          {lastCheckIn && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
              <Clock size={10} /> Último: {lastCheckIn}
            </div>
          )}
        </div>
        <button
          onClick={handleCheckIn}
          disabled={!note.trim()}
          className="bg-accent text-accent-foreground px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
        >
          <Send size={14} /> Registrar Visita
        </button>
      </div>
    </div>
  )
}
