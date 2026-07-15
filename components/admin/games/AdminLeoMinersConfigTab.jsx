import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { adminAuthFetch } from "../../../lib/admin-portal/use-admin-session.js";

const BOOL_FIELDS = [
  { key: "enabled", label: "המשחק פעיל לילדים" },
  { key: "economy_enabled", label: "כלכלת המשחק פעילה" },
  { key: "accrue_enabled", label: "צבירת נקודות פעילה" },
  { key: "claim_enabled", label: "Claim פעיל" },
  { key: "offline_enabled", label: "Offline פעיל" },
  { key: "gifts_enabled", label: "מתנות פעילות" },
  { key: "diamond_chest_enabled", label: "Diamond chest פעיל" },
  { key: "guest_play_enabled", label: "משחק אורח פעיל" },
  { key: "guest_claim_enabled", label: "Guest claim פעיל" },
  { key: "guest_diamond_enabled", label: "Guest diamond פעיל" },
  { key: "reject_impossible_stage_jump", label: "דחיית קפיצת stage בלתי אפשרית" },
];

const NUMBER_SECTIONS = [
  {
    title: "כלכלה / פרסים",
    fields: [
      { key: "daily_points_cap", label: "Daily points cap" },
      { key: "daily_coins_cap", label: "Daily coins cap" },
      { key: "max_coins_per_claim", label: "Max coins per claim" },
      { key: "min_points_to_claim", label: "Min points to claim" },
      { key: "points_to_coins_ratio", label: "Points to coins ratio", step: "0.01" },
      { key: "claim_cooldown_sec", label: "Claim cooldown (sec)" },
    ],
  },
  {
    title: "יהלומים",
    fields: [
      { key: "diamond_chest_cost", label: "Diamond chest cost" },
      { key: "diamond_chest_amount", label: "Diamond chest amount" },
      { key: "daily_diamond_cap", label: "Daily diamond cap" },
      { key: "max_diamonds_per_claim", label: "Max diamonds per claim" },
    ],
  },
  {
    title: "Offline",
    fields: [
      { key: "offline_cap_hours", label: "Offline cap (hours)", step: "0.1" },
      { key: "offline_factor", label: "Offline factor", step: "0.01" },
      { key: "offline_min_seconds", label: "Offline min seconds" },
      { key: "offline_max_claims_per_day", label: "Offline max claims/day" },
    ],
  },
  {
    title: "Anti-abuse",
    fields: [
      { key: "max_breaks_per_minute", label: "Max breaks/minute" },
      { key: "max_breaks_per_batch", label: "Max breaks/batch" },
      { key: "max_stage", label: "Max stage" },
      { key: "max_offline_elapsed_sec", label: "Max offline elapsed (sec)" },
    ],
  },
  {
    title: "אורחים",
    fields: [
      { key: "guest_multiplier", label: "Guest multiplier", step: "0.01" },
      { key: "guest_daily_points_cap", label: "Guest daily points cap" },
      { key: "guest_daily_coins_cap", label: "Guest daily coins cap" },
      { key: "guest_daily_diamond_cap", label: "Guest daily diamond cap" },
    ],
  },
  {
    title: "Gameplay tuning (משפיע על הלקוח אחרי refresh)",
    fields: [
      { key: "base_dps", label: "Base DPS", step: "0.1" },
      { key: "level_dps_multiplier", label: "Level DPS multiplier", step: "0.01" },
      { key: "rock_base_hp", label: "Rock base HP", step: "0.1" },
      { key: "rock_hp_multiplier", label: "Rock HP multiplier", step: "0.01" },
      { key: "gold_factor", label: "Gold factor", step: "0.01" },
      { key: "spawn_initial_cost", label: "Spawn initial cost" },
      { key: "spawn_cost_multiplier", label: "Spawn cost multiplier", step: "0.01" },
      { key: "dps_upgrade_multiplier", label: "DPS upgrade multiplier", step: "0.01" },
      { key: "gold_upgrade_multiplier", label: "Gold upgrade multiplier", step: "0.01" },
      { key: "auto_dog_interval_sec", label: "Auto dog interval (sec)" },
      { key: "auto_dog_bank_cap", label: "Auto dog bank cap" },
      { key: "base_stage_v1", label: "Base stage v1", step: "0.01" },
    ],
  },
];

function StatusBadge({ ok, labelOn, labelOff }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? "bg-emerald-500/20 text-emerald-200" : "bg-rose-500/20 text-rose-200"
      }`}
    >
      {ok ? labelOn : labelOff}
    </span>
  );
}

function ToggleRow({ label, checked, onChange, disabled }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
      <span className="text-sm text-white/90">{label}</span>
      <input
        type="checkbox"
        checked={checked === true}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="h-4 w-4 accent-amber-400"
      />
    </label>
  );
}

function NumberRow({ label, value, onChange, disabled, step = "1" }) {
  return (
    <label className="flex flex-col gap-1 rounded-lg border border-white/10 px-3 py-2">
      <span className="text-xs text-white/60">{label}</span>
      <input
        type="number"
        min="0"
        step={step}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-sm text-white"
      />
    </label>
  );
}

export default function AdminLeoMinersConfigTab({ accessToken }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [dbReady, setDbReady] = useState(false);
  const [code, setCode] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [catalogEnabled, setCatalogEnabled] = useState(false);
  const [soloRuleActive, setSoloRuleActive] = useState(false);
  const [gameEnabled, setGameEnabled] = useState(false);
  const [settings, setSettings] = useState({});
  const [defaults, setDefaults] = useState({});
  const [mergedPreview, setMergedPreview] = useState(null);
  const [showJson, setShowJson] = useState(false);
  const [coinsRounding, setCoinsRounding] = useState("floor");

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/leo-miners/config");
      const json = await res.json().catch(() => ({}));
      if (!json.defaults) {
        setError(json.error?.message || json.error?.code || "טעינה נכשלה");
        return;
      }
      setDbReady(json.dbReady === true);
      setCode(json.code || null);
      setIsActive(json.config?.isActive === true);
      setCatalogEnabled(json.catalogEnabled === true);
      setSoloRuleActive(json.soloRuleActive === true);
      setGameEnabled(json.gameEnabled === true);
      setDefaults(json.defaults || {});
      setMergedPreview(json.merged || json.config?.merged || null);
      const nextSettings = { ...(json.defaults || {}), ...(json.config?.settings || {}) };
      setSettings(nextSettings);
      setCoinsRounding(String(nextSettings.coins_rounding || "floor"));
    } catch {
      setError("שגיאת רשת");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const previewJson = useMemo(() => {
    const payload = {
      is_active: isActive,
      settings: { ...settings, coins_rounding: coinsRounding },
    };
    return JSON.stringify(payload, null, 2);
  }, [isActive, settings, coinsRounding]);

  const setBool = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));
  const setNum = (key, raw) => {
    const num = raw === "" ? 0 : Number(raw);
    setSettings((prev) => ({ ...prev, [key]: Number.isFinite(num) ? num : 0 }));
  };

  const save = async (resetToDefaults = false) => {
    if (!accessToken) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await adminAuthFetch(accessToken, "/api/admin/leo-miners/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resetToDefaults,
          isActive,
          catalogEnabled,
          soloRuleActive,
          settings: resetToDefaults
            ? undefined
            : {
                ...settings,
                coins_rounding: coinsRounding,
              },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        setError(json.error?.message || json.error?.code || json.message || "שמירה נכשלה");
        return;
      }
      setMessage(resetToDefaults ? "אופס לברירות מחדל" : "נשמר בהצלחה");
      setDbReady(json.dbReady === true);
      setGameEnabled(json.gameEnabled === true);
      setMergedPreview(json.merged || null);
      if (json.config?.settings) {
        setSettings({ ...defaults, ...json.config.settings });
      }
      if (typeof json.catalogEnabled === "boolean") setCatalogEnabled(json.catalogEnabled);
      if (typeof json.soloRuleActive === "boolean") setSoloRuleActive(json.soloRuleActive);
    } catch {
      setError("שגיאת רשת");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-white/60 text-sm text-right">טוען הגדרות Leo Miners…</p>;
  }

  const formDisabled = !dbReady || saving;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">Leo Miners - הגדרות משחק</h2>
          <p className="text-sm text-white/60 mt-1">
            שינוי איזון/פרסים/הפעלה - ללא migration נוסף אחרי SQL 095.
          </p>
        </div>
        <Link
          href="/admin/games"
          className="text-sm text-amber-200 hover:text-amber-100 underline"
        >
          ← חזרה לקטלוג משחקים
        </Link>
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">סטטוס</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge ok={dbReady} labelOn="DB מוכן" labelOff="DB לא מוכן" />
          <StatusBadge ok={isActive && settings.enabled} labelOn="Game enabled" labelOff="Game disabled" />
          <StatusBadge ok={catalogEnabled} labelOn="Catalog enabled" labelOff="Catalog disabled" />
          <StatusBadge ok={soloRuleActive} labelOn="Solo rule active" labelOff="Solo rule inactive" />
          <StatusBadge ok={gameEnabled} labelOn="Live for kids" labelOff="Not live" />
        </div>
        {!dbReady ? (
          <p className="text-sm text-rose-200">
            {code === "miners_db_not_ready"
              ? "טבלאות Leo Miners עדיין לא קיימות - יש להריץ migration 095 לפני שמירה."
              : "מסד הנתונים לא מוכן."}
          </p>
        ) : null}
      </section>

      {error ? <p className="text-rose-300 text-sm">{error}</p> : null}
      {message ? <p className="text-emerald-300 text-sm">{message}</p> : null}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">הפעלה ראשית</h3>
        <ToggleRow
          label="is_active (שורת config ב-DB)"
          checked={isActive}
          onChange={setIsActive}
          disabled={formDisabled}
        />
        <ToggleRow
          label="קטלוג site_game_catalog - leo-miners"
          checked={catalogEnabled}
          onChange={setCatalogEnabled}
          disabled={formDisabled}
        />
        <ToggleRow
          label="reward_economy_solo_game_rules - leo-miners"
          checked={soloRuleActive}
          onChange={setSoloRuleActive}
          disabled={formDisabled}
        />
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
        <h3 className="font-semibold text-amber-200 mb-2">דגלי הפעלה (settings_json)</h3>
        {BOOL_FIELDS.map((f) => (
          <ToggleRow
            key={f.key}
            label={f.label}
            checked={settings[f.key] === true}
            onChange={(v) => setBool(f.key, v)}
            disabled={formDisabled}
          />
        ))}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">עיגול מטבעות</h3>
        <select
          value={coinsRounding}
          onChange={(e) => setCoinsRounding(e.target.value)}
          disabled={formDisabled}
          className="rounded-md border border-white/15 bg-black/30 px-2 py-1 text-sm text-white"
        >
          <option value="floor">floor</option>
          <option value="ceil">ceil</option>
          <option value="round">round</option>
        </select>
      </section>

      {NUMBER_SECTIONS.map((section) => (
        <section key={section.title} className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h3 className="font-semibold text-amber-200 mb-3">{section.title}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {section.fields.map((f) => (
              <NumberRow
                key={f.key}
                label={f.label}
                value={settings[f.key]}
                step={f.step || "1"}
                onChange={(v) => setNum(f.key, v)}
                disabled={formDisabled}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
        <h3 className="font-semibold text-amber-200">softcut / stage_blocks</h3>
        <p className="text-sm text-white/60">
          נשמרים ב-settings_json ונקראים בשרת. לעריכה מתקדמת - JSON מלא (reset משחזר ברירות מחדל).
        </p>
        {mergedPreview ? (
          <pre className="text-xs text-white/70 bg-black/40 rounded-lg p-3 overflow-x-auto text-left dir-ltr">
            {JSON.stringify(
              {
                softcut: mergedPreview.softcut,
                stage_blocks: mergedPreview.stage_blocks,
              },
              null,
              2
            )}
          </pre>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void save(false)}
          disabled={formDisabled}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 disabled:opacity-50"
        >
          {saving ? "שומר…" : "שמירה"}
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("לאפס את כל ההגדרות לברירות מחדל?")) void save(true);
          }}
          disabled={formDisabled}
          className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => setShowJson((v) => !v)}
          className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold"
        >
          {showJson ? "הסתר JSON" : "Preview JSON"}
        </button>
      </div>

      {showJson ? (
        <pre className="text-xs text-white/80 bg-black/50 rounded-xl p-4 overflow-x-auto text-left dir-ltr">
          {previewJson}
        </pre>
      ) : null}
    </div>
  );
}
