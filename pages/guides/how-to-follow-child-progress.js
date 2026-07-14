import GuideSeoArticlePage from "../../components/seo/GuideSeoArticlePage";
import { getGuidePageContent } from "../../data/seo/guide-pages.he";

export default function GuidePage() {
  const content = getGuidePageContent("how-to-follow-child-progress");
  return <GuideSeoArticlePage content={content} />;
}
