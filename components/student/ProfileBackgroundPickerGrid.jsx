import { PROFILE_BACKGROUND_OPTIONS } from "../../lib/student-ui/profile-background-options.js";
import { resolveProfileBackgroundKey } from "../../lib/student-ui/profile-background.client.js";

/**
 * Grid of preset profile circle backgrounds.
 * @param {{ selectedKey?: string, disabled?: boolean, variant?: "bright" | "dark", onSelect: (key: string) => void }} props
 */
export default function ProfileBackgroundPickerGrid({
  selectedKey = "sky",
  disabled = false,
  variant = "bright",
  onSelect,
}) {
  const activeKey = resolveProfileBackgroundKey(selectedKey);
  const labelClass = variant === "dark" ? "text-xs text-white/60 mb-2" : "text-xs text-slate-500 mb-2";
  const idleClass =
    variant === "dark"
      ? "border border-white/10 bg-black/30 hover:bg-black/40"
      : "border border-slate-200 bg-white hover:bg-sky-50";
  const activeRingClass =
    variant === "dark" ? "scale-110 border-2 border-amber-400" : "scale-110 border-2 border-amber-400";

  return (
    <div>
      <div className={labelClass}>בחר רקע לפרופיל:</div>
      <div className="grid grid-cols-6 gap-2">
        {PROFILE_BACKGROUND_OPTIONS.map((option) => {
          const selected = activeKey === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              title={option.labelHe}
              aria-label={option.labelHe}
              aria-pressed={selected}
              onClick={() => onSelect(option.id)}
              className={`rounded-lg p-1 transition-all min-h-10 disabled:opacity-50 ${
                selected ? activeRingClass : idleClass
              }`}
            >
              <span
                className="mx-auto block h-7 w-7 rounded-full border border-white/80 shadow-sm"
                style={{ background: option.background }}
                aria-hidden
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
