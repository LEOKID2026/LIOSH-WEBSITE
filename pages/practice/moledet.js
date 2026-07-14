import PracticeSeoLandingPage from "../../components/seo/PracticeSeoLandingPage";
import { getPracticePageContent } from "../../data/seo/practice-pages.he";

export default function PracticeMoledetPage() {
  const content = getPracticePageContent("moledet");
  return <PracticeSeoLandingPage content={content} />;
}
