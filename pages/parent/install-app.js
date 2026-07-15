import ParentPwaInstallLauncher from "../../components/parent/ParentPwaInstallLauncher";
import PwaInstallPageShell from "../../components/pwa/PwaInstallPageShell";

/** SSR so manifest-parent is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function ParentPwaInstallPage() {
  return (
    <PwaInstallPageShell
      portal="parent"
      badge="P LEO KIDS"
      title="התקנת אפליקציה להורים"
      pageTitle="P LEO KIDS - התקנה"
      appleTitle="P LEO KIDS"
      appleTouchIcon="/icons/parent/apple-touch-icon.png"
      launcher={ParentPwaInstallLauncher}
    />
  );
}
