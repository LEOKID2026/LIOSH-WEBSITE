import Head from "next/head";
import TangramPrototype from "../../components/solo-games/prototypes/dev/TangramPrototype.jsx";

/** Temporary prototype — /dev/tangram-prototype */
export default function TangramPrototypePage() {
  return (
    <>
      <Head>
        <title>טנגרם - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <TangramPrototype />
    </>
  );
}
