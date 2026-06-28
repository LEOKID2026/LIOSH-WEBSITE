import { useIOSViewportFix } from "../../../hooks/useIOSViewportFix";
import OfflineHub from "../../../components/offline/OfflineHub.jsx";

export default function StudentOfflineHubPage() {
  useIOSViewportFix();
  return <OfflineHub />;
}
