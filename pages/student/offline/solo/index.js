import OfflineFullGamesRouteGuard from "../../../../components/offline/OfflineFullGamesRouteGuard.jsx";
import { OfflineSoloGamesHub } from "../../../../components/offline/OfflineHub.jsx";

export default function StudentOfflineSoloHubPage() {
  return (
    <OfflineFullGamesRouteGuard>
      <OfflineSoloGamesHub />
    </OfflineFullGamesRouteGuard>
  );
}
