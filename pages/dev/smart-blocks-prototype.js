import Head from "next/head";
import SmartBlocksPrototype from "../../components/solo-games/prototypes/SmartBlocksPrototype.jsx";

/**
 * Temporary visual prototype — not linked from the games menu.
 * URL: /dev/smart-blocks-prototype
 */
export default function SmartBlocksPrototypePage() {
  return (
    <>
      <Head>
        <title>בלוקים חכמים - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <SmartBlocksPrototype />
    </>
  );
}
