import PracticeSeoLandingPage from "../../components/seo/PracticeSeoLandingPage";
import { getPracticePageContent } from "../../data/seo/practice-pages.he";

export default function PracticeGeographyPage() {
  const content = getPracticePageContent("geography");
  return <PracticeSeoLandingPage content={content} />;
}
