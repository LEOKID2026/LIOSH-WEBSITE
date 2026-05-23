import SitePolicyPage from "../components/legal/SitePolicyPage";
import { SITE_POLICIES } from "../data/legal/sitePolicies.he";

export default function AiDisclosurePage() {
  return <SitePolicyPage policy={SITE_POLICIES.aiDisclosure} />;
}
