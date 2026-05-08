import React from 'react'
import { motion } from 'framer-motion'
import { Leaf } from 'lucide-react'

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className = '', size = 'md' }: LogoProps) {
  const sizeMap = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl'
  };

  const iconSizeMap = {
    sm: 16,
    md: 20,
    lg: 28
  };

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <motion.div 
        initial={{ rotate: -10, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-[#15803D]/10 rounded-full blur-md"></div>
        <Leaf size={iconSizeMap[size]} className="text-[#15803D] relative z-10" strokeWidth={2.5} />
        {/* Subtle Topography/Layering effect using a smaller offset leaf */}
        <Leaf 
          size={iconSizeMap[size] - 4} 
          className="text-[#1D4ED8] absolute -bottom-1 -right-1 opacity-70 z-0" 
          strokeWidth={2} 
        />
      </motion.div>
      <div className="flex flex-col">
        <span className={`font-extrabold tracking-tighter text-[#2C2420] uppercase leading-none ${sizeMap[size]}`}>
          METACAMPO
        </span>
        <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-[#334155] leading-tight">
          Agro 4.0 Premium
        </span>
      </div>
    </div>
  )
}
