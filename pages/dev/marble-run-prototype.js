import Head from "next/head";
import MarbleRunPrototype from "../../components/solo-games/prototypes/dev/MarbleRunPrototype.jsx";

/** Temporary prototype — /dev/marble-run-prototype */
export default function MarbleRunPrototypePage() {
  return (
    <>
      <Head>
        <title>מסילת כדור - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <MarbleRunPrototype />
    </>
  );
}
