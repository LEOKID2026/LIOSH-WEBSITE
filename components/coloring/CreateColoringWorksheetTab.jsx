/**
 * Coloring pages generator — pick a reward card and open printable A4 page.
 */
import { useEffect, useMemo, useState } from "react";
import { WORKSHEET_UI_HE } from "../../lib/worksheets/worksheet-ui.he.js";

const CATEGORY_LABELS = {
  shop: "חנות",
  achievement: "הישג",
  event: "אירוע",
};

/**
 * @param {{
 *   cards: Array<{ cardKey: string, displayNameHe: string, category?: string, previewPath?: string }>,
 *   selectedCardKey: string,
 *   onSelectCardKey: (key: string) => void,
 *   onSubmit: (cardKey?: string) => void,
 *   busy?: boolean,
 *   error?: string,
 *   T: Record<string, string>,
 *   loading?: boolean,
 * }} props
 */
export default function CreateColoringWorksheetTab({
  cards,
  selectedCardKey,
  onSelectCardKey,
  onSubmit,
  busy = false,
  error = "",
  T,
  loading = false,
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    if (!selectedCardKey && cards.length) {
      onSelectCardKey(cards[0].cardKey);
    }
  }, [cards, onSelectCardKey, selectedCardKey]);

  const filtered = useMemo(() => {
    const q = search.trim();
    return cards.filter((card) => {
      if (category && card.category !== category) return false;
      if (!q) return true;
      return (
        card.displayNameHe.includes(q) ||
        card.cardKey.includes(q)
      );
    });
  }, [cards, category, search]);

  const categories = useMemo(() => {
    const set = new Set(cards.map((c) => c.category).filter(Boolean));
    return [...set].sort();
  }, [cards]);

  const selected = cards.find((c) => c.cardKey === selectedCardKey) || null;

  const openCard = (cardKey) => {
    if (busy || loading) return;
    onSelectCardKey(cardKey);
    onSubmit(cardKey);
  };

  return (
    <div className="worksheet-panel space-y-5">
      <div>
        <h2 className={`text-lg font-bold ${T.heading}`}>{WORKSHEET_UI_HE.coloringCreateTitle}</h2>
        <p className={`mt-1 text-sm leading-relaxed ${T.muted}`}>{WORKSHEET_UI_HE.coloringCreateHint}</p>
        <p className={`mt-1 text-sm leading-relaxed ${T.muted}`}>{WORKSHEET_UI_HE.coloringCreateHintSub}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          className="worksheet-input min-w-[12rem] flex-1"
          placeholder={WORKSHEET_UI_HE.coloringSearchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="worksheet-select"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label={WORKSHEET_UI_HE.coloringCategoryField}
        >
          <option value="">{WORKSHEET_UI_HE.coloringCategoryAll}</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_LABELS[cat] || cat}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className={`text-sm ${T.muted}`}>{WORKSHEET_UI_HE.loading}</p>
      ) : null}

      {!loading && filtered.length === 0 ? (
        <p className={`text-sm ${T.muted}`}>{WORKSHEET_UI_HE.coloringEmpty}</p>
      ) : (
        <div className="coloring-card-grid" role="listbox" aria-label={WORKSHEET_UI_HE.coloringCardListLabel}>
          {filtered.map((card) => {
            const active = card.cardKey === selectedCardKey;
            return (
              <button
                key={card.cardKey}
                type="button"
                role="option"
                aria-selected={active}
                className={`coloring-card-tile ${active ? "coloring-card-tile--active" : ""}`}
                onClick={() => openCard(card.cardKey)}
              >
                <div className="coloring-card-tile-preview">
                  {card.previewPath ? (
                    <img src={card.previewPath} alt="" loading="lazy" draggable={false} />
                  ) : null}
                </div>
                <span className="coloring-card-tile-name">{card.displayNameHe}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <p className={`text-sm ${T.muted}`}>
          {WORKSHEET_UI_HE.coloringSelectedLabel}: <strong>{selected.displayNameHe}</strong>
        </p>
      ) : null}

      {error ? <p className={`${T.error || "worksheet-error"}`}>{error}</p> : null}

      <div className="coloring-create-actions">
        <button
          type="button"
          className={`worksheet-primary-cta ${T.primaryBtn}`}
          disabled={busy || !selectedCardKey || loading}
          onClick={() => onSubmit(selectedCardKey)}
        >
          {busy ? WORKSHEET_UI_HE.generating : WORKSHEET_UI_HE.coloringCreateWorksheet}
        </button>
      </div>
    </div>
  );
}

export function defaultColoringCreateForm() {
  return {
    worksheetType: "coloring",
    cardKey: "",
  };
}

/**
 * @param {{ cardKey?: string }} form
 */
export function buildColoringGenerateBody(form) {
  return {
    worksheetType: "coloring",
    cardKey: String(form?.cardKey || "").trim(),
  };
}
