"use client";

import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import ChessScreen from "../../../components/arcade/chess/ChessScreen";

import ArcadeRouteHoldShell from "../../../components/arcade/ArcadeRouteHoldShell.jsx";

export default function StudentChessPage() {
  const router = useRouter();
  const roomId = router.isReady ? String(router.query.roomId || "").trim() : "";

  if (!router.isReady) {
    return <ArcadeRouteHoldShell />;
  }

  if (!roomId) {
    return (
      <>
        <Head>
          <title>שחמט - ארקייד</title>
        </Head>
        <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-300 space-y-3">
          <p>חסר מזהה חדר.</p>
          <Link href="/student/arcade" className="text-sky-400 underline">
            חזרה לארקייד
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>שחמט - ארקייד</title>
      </Head>
      <div
        className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-zinc-950 text-zinc-100"
        dir="rtl"
      >
        <div
          className="game-page-mobile learning-master-fill relative flex w-full flex-1 min-h-0 flex-col overflow-hidden max-md:pl-0 max-md:pr-0 md:pl-[clamp(8px,2vw,32px)] md:pr-[clamp(8px,2vw,32px)]"
          style={{
            maxWidth: "1200px",
            width: "min(1200px, 100vw)",
            margin: "0 auto",
          }}
        >
          <ChessScreen roomId={roomId} />
        </div>
      </div>
    </>
  );
}
