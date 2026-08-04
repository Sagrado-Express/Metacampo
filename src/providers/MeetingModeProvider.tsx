"use client";

import React, { createContext, useContext } from "react";
import { useSearchParams } from "next/navigation";

interface MeetingModeContextType {
  isMeetingMode: boolean;
}

const MeetingModeContext = createContext<MeetingModeContextType>({
  isMeetingMode: false,
});

export const MeetingModeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const searchParams = useSearchParams();
  const isMeetingMode = searchParams.get("mode") === "meeting";

  return (
    <MeetingModeContext.Provider value={{ isMeetingMode }}>
      <div className={isMeetingMode ? "mode-meeting" : "mode-default"}>
        {children}
      </div>
    </MeetingModeContext.Provider>
  );
};

export const useMeetingMode = () => useContext(MeetingModeContext);
