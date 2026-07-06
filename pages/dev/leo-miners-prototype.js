import LeoMinersShell from "../../components/leo-miners/LeoMinersShell.jsx";

/** Leo Miners dev prototype — skips GameAccessGuard for local E2E before catalog enable */
export default function LeoMinersPrototypePage() {
  return <LeoMinersShell skipAccessGuard />;
}
