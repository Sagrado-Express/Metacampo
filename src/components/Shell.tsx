"use client";

import React from "react";
import { DashboardHeader } from "./DashboardHeader";

interface ShellProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function Shell({ children, title, subtitle }: ShellProps) {
  return (
    <div className="flex flex-col min-h-screen">
      <DashboardHeader title={title} subtitle={subtitle} />
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl space-y-8">
          {children}
        </div>
      </main>
    </div>
  );
}

