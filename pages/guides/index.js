import GuideSeoArticlePage from "../../components/seo/GuideSeoArticlePage";
import { getGuidePageContent } from "../../data/seo/guide-pages.he";

export default function GuidesHubPage() {
  const content = getGuidePageContent("hub");
  return <GuideSeoArticlePage content={content} isHub />;
}
