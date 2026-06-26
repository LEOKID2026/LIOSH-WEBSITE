import MarketingLandingPage from "../components/marketing/MarketingLandingPage";
import { TEACHERS_LANDING } from "../data/marketing/landing-pages.he";

export default function TeachersLandingPage() {
  return <MarketingLandingPage audience="teachers" content={TEACHERS_LANDING} />;
}
