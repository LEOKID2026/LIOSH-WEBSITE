/** Legacy hub URL — single solo hub is `/game`. */
export function getServerSideProps() {
  return {
    redirect: {
      destination: "/game",
      permanent: false,
    },
  };
}

export default function SoloGamesHubRedirect() {
  return null;
}
