import ParentDemoSessionChrome from "./ParentDemoSessionChrome.jsx";
import ParentDemoParentRouteGuard from "./ParentDemoParentRouteGuard.jsx";

export default function ParentDemoAccessGate({ children }) {
  return (
    <ParentDemoSessionChrome>
      <ParentDemoParentRouteGuard>{children}</ParentDemoParentRouteGuard>
    </ParentDemoSessionChrome>
  );
}
