import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";

const REASONS = [
  { key: "medical", label: "Medical", icon: "🚑" },
  { key: "injury", label: "Injury", icon: "🩹" },
  { key: "fire", label: "Fire", icon: "🔥" },
  { key: "equipment", label: "Equipment", icon: "⚠️" },
  { key: "other", label: "Other", icon: "🆘" },
];

// Fixed shop-floor locations. Keep this list short and human — no asset codes.
const LOCATIONS = [
  "Rotary",
  "Straight",
  "Break Room",
  "Outside / Warehouse",
  "Shop Office",
];

type Props = {
  /** Whether to fetch and show an asset picker. Default true. */
  showAssetPicker?: boolean;
  /** Optional preset location text (e.g. "Break room"). */
  presetLocation?: string;
  /** Where to anchor the button. Default "fixed" bottom-right. */
  variant?: "fixed" | "inline";
};

export function RequestHelpButton({ showAssetPicker = true, presetLocation, variant = "fixed" }: Props) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState("other");
  const [location, setLocation] = useState(presetLocation || "");
  const [reporter, setReporter] = useState("");
  const [sent, setSent] = useState(false);

  function resetAndClose() {
    setOpen(false);
    setConfirming(false);
    setSubmitting(false);
    setSent(false);
    setReason("other");
    setLocation(presetLocation || "");
    setReporter("");
  }

  async function submit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/distress", {
        reason,
        location,
        reporter,
      });
      setSent(true);
      // Auto-close the modal after 2s; the broadcaster overlay will take over.
      setTimeout(resetAndClose, 2000);
    } catch (e: any) {
      alert("Could not send: " + (e?.message || "unknown"));
      setSubmitting(false);
    }
  }

  // On mobile the bottom nav bar occupies the bottom of the viewport (h~=60px),
  // so anchor the fixed button ABOVE it (`bottom-24` ≈ 96px). On md+ screens the
  // sidebar replaces the bottom nav, so use the smaller offset.
  const btnClass =
    variant === "fixed"
      ? "fixed bottom-24 right-4 md:bottom-6 md:right-6 z-40 flex items-center gap-2 rounded-full bg-red-600 hover:bg-red-700 px-4 py-3 md:px-5 text-white font-bold shadow-2xl ring-4 ring-red-600/30 transition"
      : "inline-flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-4 py-2 text-white font-bold shadow";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={btnClass}
        aria-label="Request emergency help"
        data-testid="button-request-help"
      >
        <span className="text-xl leading-none">🆘</span>
        <span className="tracking-wide">REQUEST HELP</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {sent ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">✅</div>
                <h2 className="text-2xl font-bold text-slate-900">Alert sent</h2>
                <p className="mt-2 text-slate-600">Everyone signed in has been notified.</p>
              </div>
            ) : !confirming ? (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-red-700">Request Help</h2>
                    <p className="mt-1 text-sm text-slate-600">
                      This will alert everyone signed in on the site.
                    </p>
                  </div>
                  <button
                    onClick={resetAndClose}
                    className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Close"
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>

                <div className="mt-4">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    What kind of help?
                  </label>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {REASONS.map((r) => (
                      <button
                        key={r.key}
                        onClick={() => setReason(r.key)}
                        className={
                          "flex flex-col items-center gap-1 rounded-xl px-2 py-3 border-2 transition " +
                          (reason === r.key
                            ? "border-red-600 bg-red-50 text-red-800"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")
                        }
                        data-testid={`button-reason-${r.key}`}
                      >
                        <span className="text-xl leading-none">{r.icon}</span>
                        <span className="text-[10px] font-semibold uppercase">{r.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {showAssetPicker && (
                  <div className="mt-4">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                      Location
                    </label>
                    <select
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="mt-1 w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-base font-semibold text-slate-900"
                      data-testid="select-location"
                    >
                      <option value="">— Pick a location —</option>
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} className="text-slate-900">
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="mt-4">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-900">
                    Your name (optional)
                  </label>
                  <input
                    type="text"
                    value={reporter}
                    onChange={(e) => setReporter(e.target.value)}
                    maxLength={80}
                    placeholder="First name or initials"
                    className="mt-1 w-full rounded-lg border-2 border-slate-400 bg-white px-3 py-2 text-base font-semibold text-slate-900 placeholder:text-slate-500"
                    data-testid="input-reporter"
                  />
                </div>

                <button
                  onClick={() => setConfirming(true)}
                  className="mt-6 w-full rounded-xl bg-red-600 hover:bg-red-700 px-6 py-4 text-lg font-black text-white shadow"
                  data-testid="button-confirm-step-1"
                >
                  Continue
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-black text-red-700">Are you sure?</h2>
                <p className="mt-2 text-slate-700">
                  This sends a <span className="font-bold">full-screen alert</span> to every device signed in.
                  Only tap YES if this is a real request for help.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setConfirming(false)}
                    className="rounded-xl border-2 border-slate-300 bg-white px-4 py-4 font-bold text-slate-700 hover:bg-slate-50"
                    disabled={submitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-4 font-black text-white shadow disabled:opacity-60"
                    data-testid="button-confirm-step-2"
                  >
                    {submitting ? "Sending…" : "YES, SEND"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
