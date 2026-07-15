import Head from "next/head";
import LeoLabGame from "../../components/educational-games/leo-lab/LeoLabGame.jsx";

/** Dev preview for lab workplace pilot (production LeoLabGame component). */
export default function LeoLabWorkplacePreviewPage() {
  return (
    <>
      <Head>
        <title>מעבדה - workplace pilot preview</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <LeoLabGame backHref="/dev/learning-game-prototypes" />
    </>
  );
}
