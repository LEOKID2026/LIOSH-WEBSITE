import { useSoloGameShellUi } from "../../hooks/solo-games/useSoloGameShellUi.js";

/**
 * @param {{ open?: boolean }} props
 */
export default function SoloGameSettlingOverlay({ open = false }) {
  const { SG } = useSoloGameShellUi();

  if (!open) return null;

  return (
    <div className={SG.settlingOverlay} dir="rtl" role="status" aria-live="polite">
      <div className={SG.settlingSpinner} />
      <p className={SG.settlingTitle}>מחשבים תוצאה…</p>
      <p className={SG.settlingSub}>רגע קטן, שומרים את המטבעות שלך</p>
    </div>
  );
}
