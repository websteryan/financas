"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { FinanceProvider } from "@/lib/store";
import { AppShell } from "./AppShell";
import { TransactionSheet } from "./TransactionSheet";

export function Providers({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  if (path.startsWith("/login") || path.startsWith("/auth")) return <>{children}</>;
  return (
    <FinanceProvider>
      <AppShell>{children}</AppShell>
      <TransactionSheet />
    </FinanceProvider>
  );
}
