"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/ui/PasswordInput";

// reCAPTCHA component (assumes you have site key in env)
const Recaptcha = ({ onVerify }: { onVerify: (token: string) => void }) => {
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).grecaptcha) {
      (window as any).grecaptcha.render("recaptcha", {
        sitekey: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
        callback: (token: string) => onVerify(token),
      });
    }
  }, []);
  return <div id="recaptcha" className="my-4" />;
};

export default function RegisterPage() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [captchaToken, setCaptchaToken] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "no_invite">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Extrair token da URL no mount. Precisa ser efeito (não estado derivado
  // durante o render): a página é pré-renderizada estaticamente sem acesso a
  // `window`, então o valor real só existe depois da hidratação — calcular
  // durante o render causaria mismatch entre o HTML estático e o cliente.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const token = params.get("invite");
      if (token) {
        setInviteToken(token);
      } else {
        setStatus("no_invite");
      }
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setErrorMsg("Por favor, complete o reCAPTCHA.");
      return;
    }
    if (!inviteToken) {
      setErrorMsg("Token de convite inválido ou expirado.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, captchaToken, inviteToken }),
      });
      if (res.ok) {
        setStatus("success");
        setTimeout(() => router.push("/login"), 1500);
      } else {
        const data = await res.json();
        setErrorMsg(data.message || "Falha no cadastro.");
        setStatus("error");
      }
    } catch (err) {
      setErrorMsg("Erro inesperado.");
      setStatus("error");
    }
  };

  if (status === "no_invite") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-primary/5 to-primary/10 p-4">
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-md shadow-xl p-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex flex-col items-center">
            <AlertCircle size={48} className="text-amber-600 mb-4" />
            <h2 className="text-2xl font-bold text-center text-slate-800 mb-4">
              Cadastro por Convite
            </h2>
            <p className="text-center text-slate-600 text-sm">
              O cadastro de novos usuários está disponível apenas mediante convite válido.
            </p>
            <p className="text-center text-slate-500 text-xs mt-4">
              Se você recebeu um convite, clique no link fornecido no e-mail.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-r from-primary/5 to-primary/10 p-4">
      <motion.div
        className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur-md shadow-xl p-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-center text-primary mb-6">
          Crie sua conta
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Nome completo"
            required
            value={form.name}
            onChange={handleChange}
            className="w-full rounded-xl border-2 border-primary/10 p-3 focus:border-primary transition"
          />
          <input
            type="email"
            name="email"
            placeholder="E‑mail"
            required
            value={form.email}
            onChange={handleChange}
            className="w-full rounded-xl border-2 border-primary/10 p-3 focus:border-primary transition"
          />
          <PasswordInput
            name="password"
            placeholder="Senha"
            required
            minLength={8}
            value={form.password}
            onChange={handleChange}
            className="border-2 border-primary/10 focus:border-primary"
          />
          <Recaptcha onVerify={setCaptchaToken} />
          {status === "error" && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-white font-medium hover:bg-primary/90 transition disabled:opacity-50"
          >
            {status === "loading" ? (
              <Loader2 className="animate-spin" size={20} />
            ) : (
              "Cadastrar"
            )}
          </button>
        </form>
        {status === "success" && (
          <div className="mt-4 flex items-center gap-2 text-emerald-600">
            <CheckCircle2 size={20} />
            <span>Conta criada! Redirecionando...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
