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
      badge="P-LEO K"
      title="התקנת אפליקציה להורים"
      pageTitle="P-LEO K — התקנה"
      appleTitle="P-LEO K"
      appleTouchIcon="/images/parent-icons/icon-192.png"
      launcher={ParentPwaInstallLauncher}
    />
  );
}
