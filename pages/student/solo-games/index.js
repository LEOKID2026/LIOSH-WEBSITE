/** Legacy hub URL — scoped to /student/game so PWA scope /student/ is preserved. */
export function getServerSideProps() {
  return {
    redirect: {
      destination: "/student/game",
      permanent: false,
    },
  };
}

export default function SoloGamesHubRedirect() {
  return null;
}
