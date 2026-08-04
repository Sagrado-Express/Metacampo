"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2, Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus("success");
        // Force session refresh or redirect
        setTimeout(() => {
          router.push("/workspace");
          router.refresh();
        }, 1200);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Falha no login.");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Erro inesperado.");
      setStatus("error");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-900/10 via-emerald-800/5 to-slate-900/20 p-4">
      <motion.div
        className="w-full max-w-md rounded-2xl bg-white/90 backdrop-blur-md shadow-2xl p-8 border border-emerald-500/10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-full bg-emerald-600/10 flex items-center justify-center text-emerald-600 mb-2">
            <Lock size={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">
            Acesse o MetaCampo
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Entre com suas credenciais para continuar
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Mail size={18} />
            </div>
            <input
              type="email"
              name="email"
              placeholder="E‑mail"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition outline-none text-slate-700 bg-white"
            />
          </div>

          <PasswordInput
            showLockIcon
            name="password"
            placeholder="Senha"
            required
            value={form.password}
            onChange={handleChange}
            className="border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-700 bg-white"
          />

          {status === "error" && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={status === "loading" || status === "success"}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-3 text-white font-medium hover:bg-emerald-700 transition disabled:opacity-50 shadow-md shadow-emerald-600/10 cursor-pointer"
          >
            {status === "loading" ? (
              <Loader2 className="animate-spin" size={20} />
            ) : status === "success" ? (
              "Acessando..."
            ) : (
              "Entrar"
            )}
          </button>
        </form>

        {status === "success" && (
          <div className="mt-4 flex items-center justify-center gap-2 text-emerald-600 font-medium">
            <CheckCircle2 size={20} className="animate-bounce" />
            <span>Login realizado com sucesso!</span>
          </div>
        )}

      </motion.div>
    </div>
  );
}
