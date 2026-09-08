"use client";

import { useEffect, useState } from "react";

const BREAKPOINT = "(max-width: 767px)";

/** Mesmo breakpoint do Tailwind `md:` (768px) — usado onde uma decisão de
 *  layout precisa de um valor JS (ex.: largura animada pelo Framer Motion),
 *  não só classes CSS condicionais. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(BREAKPOINT);
    // Precisa do valor real assim que monta (SSR não sabe a largura da
    // tela) — sem isso o primeiro render sempre assumiria desktop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isMobile;
}
