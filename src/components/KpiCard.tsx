"use client";

import React from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon: LucideIcon;
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  change, 
  trend = "neutral", 
  icon: Icon,
  className 
}: KpiCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "glass-card group p-6 flex flex-col justify-between min-h-[140px]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="label-finance">{title}</span>
          <h3 className="text-2xl font-bold tracking-tight font-tabular">
            {value}
          </h3>
        </div>
        <div className="rounded-lg bg-accent/10 p-2 text-accent group-hover:bg-accent group-hover:text-white transition-colors duration-300">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      
      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span className={cn(
            "text-xs font-semibold px-2 py-0.5 rounded-full",
            trend === "up" ? "bg-success/20 text-success" : 
            trend === "down" ? "bg-destructive/20 text-destructive" : 
            "bg-muted text-muted-foreground"
          )}>
            {change}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            vs. mês anterior
          </span>
        </div>
      )}
    </motion.div>
  );
}
