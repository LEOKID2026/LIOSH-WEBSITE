import Head from "next/head";
import WeatherStationPrototype from "../../components/prototypes/dev/learning/WeatherStationPrototype.jsx";

export default function WeatherStationPrototypePage() {
  return (
    <>
      <Head>
        <title>תחנת מזג האוויר - אבטיפוס</title>
        <meta name="robots" content="noindex,nofollow" />
      </Head>
      <WeatherStationPrototype />
    </>
  );
}
