import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth, isManager } from "@/lib/auth";

// The frontend and backend share the same origin under the reverse proxy in
// prod. In dev, the Vite proxy handles /api. So we can always use relative URLs.
const API_BASE = "__PORT_5000__".startsWith("__") ? "" : "__PORT_5000__";

type Alert = {
  id: number;
  reason: string;
  location: string;
  reporter: string;
  createdAt: string;
  status: "active" | "responding" | "resolved";
  responderName: string;
  respondedAt: string;
  resolvedAt: string;
  resolutionNote: string;
};

const REASON_LABELS: Record<string, { en: string; icon: string }> = {
  medical: { en: "Medical", icon: "🚑" },
  injury: { en: "Injury", icon: "🩹" },
  fire: { en: "Fire", icon: "🔥" },
  equipment: { en: "Equipment Danger", icon: "⚠️" },
  other: { en: "Help Needed", icon: "🆘" },
};

function relTime(iso: string) {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

export function DistressBroadcaster() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tick, setTick] = useState(0); // force re-render for relative timestamps
  const [resolveFor, setResolveFor] = useState<number | null>(null);
  const [resolveNote, setResolveNote] = useState("");
  // Anonymous users can dismiss the overlay locally so they can reach the login page.
  // The set of alert IDs we've dismissed; new incoming alert IDs reopen the overlay.
  const [dismissedIds, setDismissedIds] = useState<Set<number>>(new Set());
  const { role } = useAuth();

  // Update rel-times each second.
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll for active distress alerts instead of holding a WebSocket/SSE
  // connection open (Vercel serverless functions can't hold long-lived
  // connections). A 5s interval keeps the panic-button experience snappy
  // without hammering the DB.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(`${API_BASE}/api/distress/active`);
        if (!res.ok) return;
        const list = (await res.json()) as Alert[];
        if (!cancelled) setAlerts(list);
      } catch {
        // Ignore transient network errors; next poll will retry.
      }
    }
    poll();
    const id = setInterval(poll, 5000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const active = useMemo(() => alerts.filter((a) => a.status !== "resolved"), [alerts]);
  // Dismissal is anonymous-only — once signed in as a manager/production user we always show the overlay so they can respond.
  const canRespond = isManager(role);
  const visibleActive = useMemo(
    () => (canRespond ? active : active.filter((a) => !dismissedIds.has(a.id))),
    [active, dismissedIds, canRespond]
  );
  if (visibleActive.length === 0) return null;

  function setDismissed(_val: boolean) {
    // Called by the anonymous "Sign in to respond" / "Hide" buttons — dismiss the primary alert locally.
    if (visibleActive[0]) {
      const id = visibleActive[0].id;
      setDismissedIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    }
  }

  async function respond(id: number) {
    const responderName = role ? role.replace("_", " ") : "responder";
    try {
      await apiRequest("POST", `/api/distress/${id}/respond`, { responderName });
    } catch (e: any) {
      alert("Could not acknowledge: " + (e?.message || "unknown"));
    }
  }

  async function submitResolve(id: number) {
    const responderName = role ? role.replace("_", " ") : "responder";
    try {
      await apiRequest("POST", `/api/distress/${id}/resolve`, {
        note: resolveNote,
        responderName,
      });
      setResolveFor(null);
      setResolveNote("");
    } catch (e: any) {
      alert("Could not resolve: " + (e?.message || "unknown"));
    }
  }

  // Show only the newest alert as the full takeover; queue any others as a strip.
  const primary = visibleActive[0];
  const queued = visibleActive.slice(1);
  const isResolving = resolveFor === primary.id;
  const reasonMeta = REASON_LABELS[primary.reason] || REASON_LABELS.other;
  const bg =
    primary.status === "responding"
      ? "from-amber-600 via-amber-500 to-orange-500"
      : "from-red-800 via-red-600 to-red-500";

  return (
    <div className="fixed inset-0 pointer-events-auto" style={{zIndex: 9999}} data-testid="distress-broadcaster">
      {/* Pulsing full-screen backdrop */}
      <div className={`absolute inset-0 bg-gradient-to-br ${bg} animate-[distressPulse_1.2s_ease-in-out_infinite]`} />
      <style>{`
        @keyframes distressPulse {
          0%, 100% { opacity: 0.96; }
          50% { opacity: 0.82; }
        }
        @keyframes distressRingPulse {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
      {/* Content */}
      <div className="relative z-10 flex h-full w-full items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-3xl rounded-3xl bg-white/95 shadow-2xl backdrop-blur-md p-8 sm:p-12 text-slate-900">
          <div className="flex items-start gap-6">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-full bg-red-500/40 animate-[distressRingPulse_1.6s_ease-out_infinite]" />
              <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center rounded-full bg-red-600 text-4xl sm:text-5xl">
                {reasonMeta.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs sm:text-sm font-semibold uppercase tracking-widest text-red-700">
                {primary.status === "responding" ? "Response en route" : "Distress alert"}
              </div>
              <div className="mt-2 text-4xl sm:text-6xl font-black tracking-tight leading-none">
                {reasonMeta.en}
              </div>
              <div className="mt-4 grid gap-2 text-lg sm:text-xl">
                <div>
                  <span className="text-slate-500">Reported by:</span>{" "}
                  <span className="font-semibold" data-testid="distress-reporter">{primary.reporter || "Unidentified"}</span>
                </div>
                {primary.location && (
                  <div>
                    <span className="text-slate-500">Location:</span>{" "}
                    <span className="font-semibold" data-testid="distress-location">{primary.location}</span>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">Called:</span>{" "}
                  <span className="font-mono">{relTime(primary.createdAt)}</span>
                </div>
                {primary.status === "responding" && (
                  <div className="mt-2 rounded-xl bg-amber-100 px-4 py-3 text-amber-900 font-semibold">
                    {primary.responderName} is responding
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            {canRespond ? (
              <>
                {primary.status !== "responding" && (
                  <button
                    onClick={() => respond(primary.id)}
                    className="flex-1 rounded-xl bg-amber-500 hover:bg-amber-600 px-6 py-4 text-lg font-bold text-white shadow-lg transition"
                    data-testid="button-distress-respond"
                  >
                    I&apos;m responding
                  </button>
                )}
                {!isResolving ? (
                  <button
                    onClick={() => {
                      setResolveFor(primary.id);
                      setResolveNote("");
                    }}
                    className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition"
                    data-testid="button-distress-clear"
                  >
                    Mark resolved
                  </button>
                ) : null}
              </>
            ) : (
              <div className="w-full space-y-3">
                <div className="rounded-xl bg-slate-100 px-6 py-4 text-center text-base text-slate-700">
                  Only Production or Plant Manager can acknowledge or clear this alert.
                </div>
                <button
                  onClick={() => {
                    setDismissed(true);
                    if (!location.hash.startsWith("#/login")) {
                      location.hash = "#/login";
                    }
                  }}
                  className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 px-6 py-4 text-lg font-bold text-white shadow-lg transition"
                  data-testid="button-distress-signin"
                >
                  Sign in to respond
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  data-testid="button-distress-dismiss"
                >
                  Hide alert on this device
                </button>
              </div>
            )}
          </div>

          {isResolving && (
            <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
              <label className="block text-sm font-semibold text-slate-700">
                Resolution note (optional)
              </label>
              <textarea
                value={resolveNote}
                onChange={(e) => setResolveNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What happened, what action was taken…"
                autoComplete="off"
                autoCorrect="on"
                spellCheck={true}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                style={{fontSize: '16px', WebkitAppearance: 'none', touchAction: 'manipulation'}}
                data-testid="input-distress-resolve-note"
              />
              <div className="mt-3 flex gap-2 justify-end">
                <button
                  onClick={() => setResolveFor(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => submitResolve(primary.id)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-2 font-semibold text-white"
                  data-testid="button-distress-resolve-submit"
                >
                  Confirm resolved
                </button>
              </div>
            </div>
          )}

          {queued.length > 0 && (
            <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
              <span className="font-semibold">+{queued.length}</span> other active alert{queued.length > 1 ? "s" : ""} — handle this one, then the next will appear.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
