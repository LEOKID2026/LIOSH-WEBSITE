import TeacherPwaInstallLauncher from "../../components/teacher/TeacherPwaInstallLauncher";
import PwaInstallPageShell from "../../components/pwa/PwaInstallPageShell";

/** SSR so manifest-teacher is chosen in _app Head from the first HTML byte. */
export async function getServerSideProps() {
  return { props: {} };
}

export default function TeacherPwaInstallPage() {
  return (
    <PwaInstallPageShell
      portal="teacher"
      badge="T LEO KIDS"
      title="התקנת אפליקציה למורים"
      pageTitle="T LEO KIDS - התקנה"
      appleTitle="T LEO KIDS"
      appleTouchIcon="/icons/teacher/apple-touch-icon.png"
      launcher={TeacherPwaInstallLauncher}
    />
  );
}
