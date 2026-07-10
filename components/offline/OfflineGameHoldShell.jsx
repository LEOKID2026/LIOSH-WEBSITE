import Layout from "../Layout";

/** Holds offline same-device game chrome while client hydrates — after StudentAccessGate. */
export default function OfflineGameHoldShell() {
  return (
    <Layout>
      <div
        className="relative w-full overflow-hidden bg-gradient-to-b from-[#090d17] to-[#11172b] game-page-mobile flex flex-col min-h-[100svh]"
        aria-busy="true"
      />
    </Layout>
  );
}
