import MarketingLandingPage from "../components/marketing/MarketingLandingPage";
import { KIDS_LANDING } from "../data/marketing/landing-pages.he";

export default function KidsLandingPage() {
  return <MarketingLandingPage audience="kids" content={KIDS_LANDING} />;
}
