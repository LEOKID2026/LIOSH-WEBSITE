import Link from "next/link";
import { useStudentTheme } from "../../../contexts/StudentThemeContext.jsx";
import StudentCardsShopView from "../../student/rewards/StudentCardsShopView.jsx";

/**
 * @param {{
 *   gh: Record<string, string>,
 *   coinBalance?: number|null,
 *   onCoinBalanceChange?: (balance: number) => void,
 *   studentFullName?: string,
 *   demoDisabled?: boolean,
 * }} props
 */
export default function ArcadeClubShopPanel({
  gh,
  coinBalance = null,
  onCoinBalanceChange,
  studentFullName = "",
  demoDisabled = false,
}) {
  const { tokens: T } = useStudentTheme();

  if (demoDisabled) {
    return (
      <div className={`${gh.arcadePanelShop || gh.card} space-y-3 text-right min-w-0`} dir="rtl">
        <h3 className={gh.arcadeSectionTitle || gh.sectionTitle}>חנות קלפים</h3>
        <p className={gh.arcadePanelBlurb || gh.cardBlurb}>
          חנות הקלפים אינה פעילה במצב הדגמה. ניתן לצפות באוסף הדגמה בדף הקלפים.
        </p>
        <Link href="/student/cards" className={gh.btnJoinCode || gh.btnSecondary}>
          לאוסף הדגמה
        </Link>
      </div>
    );
  }

  return (
    <div className={`${gh.arcadePanelShop || gh.card} space-y-4 text-right min-w-0`} dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className={gh.arcadeSectionTitle || gh.sectionTitle}>חנות קלפים</h3>
        <Link href="/student/cards" className={gh.btnJoinCode || gh.btnSecondary}>
          לאוסף שלי
        </Link>
      </div>
      <StudentCardsShopView
        T={T}
        coinBalance={coinBalance}
        onCoinBalanceChange={onCoinBalanceChange}
        studentFullName={studentFullName}
      />
    </div>
  );
}
