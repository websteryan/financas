"use client";

import { useEffect, useState } from "react";
import { Button, showToast } from "./ui";
import { disablePush, enablePush, pushState, type PushState } from "@/lib/push";

const TEXT: Record<PushState, string> = {
  on: "Ativados neste aparelho. Você recebe um aviso às 9h no dia do vencimento e enquanto houver pendências.",
  off: "Receba um aviso às 9h quando um pagamento recorrente vencer.",
  blocked: "As notificações estão bloqueadas neste aparelho. Libere nas configurações do navegador ou do iPhone.",
  unsupported: "Este navegador não suporta notificações. No iPhone, adicione o Lastro à Tela de Início e abra por lá.",
  demo: "Disponível apenas com a conta na nuvem (Supabase).",
};

export function PushPanel() {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    void pushState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, []);

  if (!state) return null;
  const can = state === "on" || state === "off";

  async function toggle() {
    setBusy(true);
    try {
      const next = state === "on" ? await disablePush() : await enablePush();
      setState(next);
      showToast(next === "on" ? "Lembretes ativados" : "Lembretes desativados");
    } catch (e) {
      showToast(e instanceof Error && /push_subscriptions/.test(e.message) ? "Falta rodar o SQL novo no Supabase." : "Não foi possível alterar os lembretes.");
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
      <p className="min-w-0 flex-1 basis-56 text-[14px] text-muted">{TEXT[state]}</p>
      {can && (
        <Button variant={state === "on" ? "secondary" : "primary"} className="h-11 shrink-0 px-4 text-sm" onClick={toggle} disabled={busy}>
          {state === "on" ? "Desativar" : "Ativar lembretes"}
        </Button>
      )}
    </div>
  );
}
