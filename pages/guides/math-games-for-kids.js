import GuideSeoArticlePage from "../../components/seo/GuideSeoArticlePage";
import { getGuidePageContent } from "../../data/seo/guide-pages.he";

export default function GuidePage() {
  const content = getGuidePageContent("math-games-for-kids");
  return <GuideSeoArticlePage content={content} />;
}
