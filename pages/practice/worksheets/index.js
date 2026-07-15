import PracticeSeoLandingPage from "../../../components/seo/PracticeSeoLandingPage";
import { getWorksheetsPageContent } from "../../../data/seo/worksheets-pages.he";

export default function PublicWorksheetsPage() {
  const content = getWorksheetsPageContent();
  return <PracticeSeoLandingPage content={content} />;
}
