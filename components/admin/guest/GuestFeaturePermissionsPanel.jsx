import { useCallback, useEffect, useState } from "react";

/** @param {{ accessToken: string, onMessage?: (msg: string) => void }} props */
export default function GuestFeaturePermissionsPanel({ accessToken, onMessage }) {
  const [features, setFeatures] = useState([]);
  const [busy, setBusy] = useState(false);

  const headers = useCallback(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch("/api/admin/guest/features", { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.ok) setFeatures(json.features || []);
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (nextFeatures) => {
    setBusy(true);
    onMessage?.("");
    try {
      const res = await fetch("/api/admin/guest/features", {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          features: nextFeatures.map((f) => ({
            featureKey: f.featureKey,
            enabledForGuest: f.enabledForGuest,
          })),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        onMessage?.("שמירת הרשאות נכשלה");
        return;
      }
      setFeatures(json.features || nextFeatures);
      onMessage?.("הרשאות פיצ'רים לאורחים עודכנו");
    } catch {
      onMessage?.("שגיאת רשת");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (featureKey) => {
    const next = features.map((f) =>
      f.featureKey === featureKey ? { ...f, enabledForGuest: !f.enabledForGuest } : f
    );
    void save(next);
  };

  const setAll = (open) => {
    const next = features.map((f) => ({ ...f, enabledForGuest: open }));
    void save(next);
  };

  return (
    <section className="rounded-xl border border-white/15 bg-white/5 p-4 space-y-3 text-right" dir="rtl">
      <h2 className="text-lg font-bold">הרשאות פיצ'רים חברתיים לאורחים</h2>
      <p className="text-xs text-white/60">
        כל toggle נשלט דרך Admin - אין חסימה קשיחה בקוד. ברירת מחדל מוצגת בעמודה.
      </p>
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" disabled={busy || !features.length} onClick={() => setAll(true)} className="rounded-lg border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-sm">
          פתח הכל
        </button>
        <button type="button" disabled={busy || !features.length} onClick={() => setAll(false)} className="rounded-lg border border-white/25 px-3 py-1 text-sm">
          סגור הכל
        </button>
      </div>
      <ul className="space-y-2">
        {features.map((f) => (
          <li key={f.featureKey} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(f.enabledForGuest)}
                disabled={busy}
                onChange={() => toggle(f.featureKey)}
              />
              <span>{f.labelHe || f.featureKey}</span>
            </label>
            <span className="text-[10px] text-white/45">
              ברירה: {f.defaultEnabled ? "פתוח" : "סגור"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
