import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import { OfflineEducationalGamesHub } from "../../../../components/offline/OfflineHub.jsx";

export default function StudentOfflineEducationalHubPage() {
  return (
    <OfflineFullGamesRouteGuard>
      <OfflineEducationalGamesHub />
    </OfflineFullGamesRouteGuard>
  );
}
