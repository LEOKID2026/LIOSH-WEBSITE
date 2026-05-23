import SitePolicyPage from "../components/legal/SitePolicyPage";
import { SITE_POLICIES } from "../data/legal/sitePolicies.he";

export default function AccessibilityPage() {
  return <SitePolicyPage policy={SITE_POLICIES.accessibility} />;
}
