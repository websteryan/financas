"use client";

import Link from "next/link";
import { CloudSlash } from "./icons";
import { isCloud } from "@/lib/supabase/config";

export function DemoBanner() {
  if (isCloud) return null;
  return (
    <Link
      href="/contas"
      className="mb-5 flex items-center gap-3 rounded-[12px] border border-line bg-surface px-4 py-3 text-[13px] text-muted transition-colors hover:text-fg"
    >
      <CloudSlash size={18} className="shrink-0 text-accent" />
      <span>Modo demonstração: os dados ficam só neste navegador. Conecte o Supabase para sincronizar.</span>
    </Link>
  );
}
