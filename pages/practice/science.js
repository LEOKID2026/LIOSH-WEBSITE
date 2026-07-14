import PracticeSeoLandingPage from "../../components/seo/PracticeSeoLandingPage";
import { getPracticePageContent } from "../../data/seo/practice-pages.he";

export default function PracticePage() {
  const content = getPracticePageContent("science");
  return <PracticeSeoLandingPage content={content} />;
}
