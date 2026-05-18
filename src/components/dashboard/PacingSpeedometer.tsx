"use client";

import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface PacingSpeedometerProps {
  realized: number;
  target: number;
  shadowTarget: number;
  label: string;
}

/**
 * PacingSpeedometer: High-End Gauge Component
 * Visualizes Realized vs Shadow Target (Phantom Line)
 */
export function PacingSpeedometer({ realized, target, shadowTarget, label }: PacingSpeedometerProps) {
  const percentage = Math.min(100, (realized / target) * 100);
  const shadowPercentage = Math.min(100, (shadowTarget / target) * 100);
  
  const isAhead = realized >= shadowTarget;
  const statusColor = isAhead ? "var(--color-primary)" : "var(--color-warning)";
  
  // SVG Arc constants
  const radius = 80;
  const circumference = Math.PI * radius; // Half circle
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const shadowOffset = circumference - (shadowPercentage / 100) * circumference;

  return (
    <div className="glass-card p-6 flex flex-col items-center justify-center min-w-[240px]">
      <span className="label-finance mb-4">{label}</span>
      
      <div className="relative h-32 w-48 overflow-hidden">
        <svg viewBox="0 0 200 100" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-muted)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          
          {/* Progress Arc */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={statusColor}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />

          {/* Shadow Target (Phantom Line) */}
          <motion.path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--color-foreground)"
            strokeWidth="2"
            strokeDasharray="4 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3, strokeDashoffset: shadowOffset }}
            style={{ strokeDasharray: `4 4`, strokeDashoffset: shadowOffset }}
          />
        </svg>

        {/* Value Display */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className="text-2xl font-bold font-tabular">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(realized)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            Meta: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(target)}
          </span>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-4 flex items-center gap-2">
        {isAhead ? (
          <div className="flex items-center gap-1 text-primary text-xs font-semibold">
            <TrendingUp size={14} />
            <span>ACIMA DO PACING</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-warning text-xs font-semibold">
            <TrendingDown size={14} />
            <span>ATRASO COMERCIAL</span>
          </div>
        )}
      </div>
      
      <div className="mt-1 text-[10px] text-muted-foreground/60 italic">
        Shadow Target: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(shadowTarget)}
      </div>
    </div>
  );
}
