import { getParentPortalTheme } from "../../lib/parent-ui/parent-portal-theme.client.js";
import { useStudentTheme } from "../../contexts/StudentThemeContext.jsx";
import PublicWorksheetsHub from "../worksheets/PublicWorksheetsHub.client.jsx";
import { getPublicSeoWideClasses } from "./public-seo-wide-theme";

/**
 * @param {{
 *   generatorLead?: { h2: string, paragraph: string },
 *   readyLead?: { h2: string, paragraph: string },
 *   landingStyles?: Record<string, string>,
 * }} [props]
 */
export default function PublicSeoWorksheetsHubSlot({ generatorLead, readyLead, landingStyles }) {
  const { isBright } = useStudentTheme();
  const cls = getPublicSeoWideClasses(isBright);
  const T = getParentPortalTheme(isBright);
  const hubSlotClass = landingStyles?.hubSlot || "";

  return (
    <section
      className={`${hubSlotClass} public-seo-worksheets-slot ${cls.interactiveSlot}`}
      data-testid="public-seo-worksheets-slot"
      aria-label="מחולל וקטלוג דפי עבודה"
    >
      <PublicWorksheetsHub
        T={T}
        landingEmbed={Boolean(generatorLead && readyLead)}
        generatorLead={generatorLead}
        readyLead={readyLead}
        sectionLeadClass={landingStyles?.sectionLead || ""}
      />
    </section>
  );
}
