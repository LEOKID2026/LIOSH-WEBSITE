import WorksheetsSeoLandingPage from "../../../components/seo/WorksheetsSeoLandingPage";
import { getWorksheetsPageContent } from "../../../data/seo/worksheets-pages.he";

export default function PublicWorksheetsPage() {
  const content = getWorksheetsPageContent();
  return <WorksheetsSeoLandingPage content={content} />;
}
