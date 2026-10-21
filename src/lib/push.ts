import { repo } from "./repo";
import { isCloud } from "./supabase/config";
import { supabaseBrowser } from "./supabase/client";

/** Chave pública VAPID (a privada fica só nos segredos da função no Supabase). */
const VAPID_PUBLIC = "BAEBl2ASI_oneAy1ZXFHc9Ws8oPLI7nfJYkDk2r2ls_7XGEpUoTdyLvr27ItcMbkR2evXE33OmNaf50lglWTdoo";

export type PushState = "unsupported" | "demo" | "blocked" | "off" | "on";

function b64ToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function pushState(): Promise<PushState> {
  if (!isCloud) return "demo";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    return sub && Notification.permission === "granted" ? "on" : "off";
  } catch {
    return "off";
  }
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return perm === "denied" ? "blocked" : "off";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(VAPID_PUBLIC) }));
  const j = sub.toJSON();
  await repo.savePushSub({
    endpoint: sub.endpoint,
    p256dh: j.keys?.p256dh ?? "",
    auth: j.keys?.auth ?? "",
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Cuiaba",
  });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration("/sw.js");
  const sub = await reg?.pushManager.getSubscription();
  if (sub) {
    await repo.deletePushSub(sub.endpoint);
    await sub.unsubscribe();
  }
  return "off";
}

/** Pede ao servidor que mande uma notificação de teste para os aparelhos do usuário. */
export async function sendTestPush(): Promise<{ sent: number; devices: number }> {
  const { data, error } = await supabaseBrowser().functions.invoke("lembretes", { body: { test: true } });
  if (error) throw new Error(error.message);
  return data as { sent: number; devices: number };
}
