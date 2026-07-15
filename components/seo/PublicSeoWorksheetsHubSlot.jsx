import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PublicWorksheetsHub from "../worksheets/PublicWorksheetsHub.client.jsx";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/**
 * Worksheets generator + catalog embedded in the public SEO wide layout.
 */
export default function PublicSeoWorksheetsHubSlot() {
  const { isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);
  const T = getParentPortalTheme(isBright);

  return (
    <section
      className={`public-seo-worksheets-slot ${cls.interactiveSlot}`}
      data-testid="public-seo-worksheets-slot"
      aria-label="מחולל וקטלוג דפי עבודה"
    >
      <PublicWorksheetsHub T={T} />
    </section>
  );
}
