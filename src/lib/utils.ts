import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extrai uma mensagem legível de um valor capturado em catch (tipo unknown). */
export function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
