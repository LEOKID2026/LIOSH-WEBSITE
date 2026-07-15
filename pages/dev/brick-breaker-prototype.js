import Head from "next/head";
import BrickBreakerPrototype from "../../components/solo-games/prototypes/dev/BrickBreakerPrototype.jsx";

/** Temporary prototype — /dev/brick-breaker-prototype */
export default function BrickBreakerPrototypePage() {
  return (
    <>
      <Head>
        <title>שובר לבנים - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <BrickBreakerPrototype />
    </>
  );
}
