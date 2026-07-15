import Head from "next/head";
import LeoDogGame from "../../components/prototypes/dev/leo-dog/LeoDogGame.jsx";

/** Virtual pet prototype — /dev/leo-dog-prototype */
export default function LeoDogPrototypePage() {
  return (
    <>
      <Head>
        <title>הכלב של ליאו - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <LeoDogGame />
    </>
  );
}
