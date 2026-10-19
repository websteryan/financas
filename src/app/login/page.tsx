"use client";

import { useState, type FormEvent } from "react";
import { GoogleLogo, Wallet } from "@/components/icons";
import { Button, Field, Segmented, inputClass } from "@/components/ui";
import { supabaseBrowser } from "@/lib/supabase/client";
import { isCloud } from "@/lib/supabase/config";

type Mode = "entrar" | "criar";

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>("entrar");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function google() {
    if (!isCloud) {
      window.location.href = "/";
      return;
    }
    setBusy(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError("Não foi possível entrar com o Google. Tente novamente.");
      setBusy(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isCloud) {
      window.location.href = "/";
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    const sb = supabaseBrowser();
    if (mode === "entrar") {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
        setBusy(false);
        return;
      }
      window.location.href = "/";
    } else {
      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      if (data.session) window.location.href = "/";
      else {
        setInfo("Conta criada. Confirme pelo link enviado ao seu e-mail e depois entre.");
        setMode("entrar");
        setBusy(false);
      }
    }
  }

  return (
    <main className="pt-safe flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="fade-in w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="bg-brand glow mb-4 inline-flex size-14 items-center justify-center rounded-full">
            <Wallet size={24} weight="bold" />
          </span>
          <h1 className="text-[30px] font-semibold tracking-tight">Finanças</h1>
          <p className="mt-1 text-[15px] text-muted">Seus gastos e receitas, em qualquer aparelho.</p>
        </div>

        <form onSubmit={submit} className="card flex flex-col gap-4 p-5 sm:p-6">
          <Button type="button" variant="primary" onClick={google} disabled={busy} className="h-14">
            <GoogleLogo size={20} weight="bold" />
            Entrar com Google
          </Button>
          <div className="flex items-center gap-3 text-[13px] text-muted">
            <span className="h-px flex-1 bg-line" />
            ou com e-mail
            <span className="h-px flex-1 bg-line" />
          </div>
          <Segmented
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
            options={[
              { value: "entrar", label: "Entrar" },
              { value: "criar", label: "Criar conta" },
            ]}
          />
          <Field label="E-mail" htmlFor="email">
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className={inputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field label="Senha" htmlFor="senha" hint={mode === "criar" ? "Mínimo de 6 caracteres." : undefined}>
            <input
              id="senha"
              type="password"
              required
              minLength={6}
              autoComplete={mode === "entrar" ? "current-password" : "new-password"}
              className={inputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error && (
            <p role="alert" className="text-sm text-expense">
              {error}
            </p>
          )}
          {info && <p className="text-sm text-income">{info}</p>}
          <Button type="submit" variant="secondary" disabled={busy} className="mt-1 h-12">
            {busy ? "Aguarde..." : mode === "entrar" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
      </div>
    </main>
  );
}
