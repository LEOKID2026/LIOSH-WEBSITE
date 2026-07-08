export const STUDENT_WORLD_BG = {
  mobile: "/images/student-world/world-home-mobile.png",
  desktop: "/images/student-world/world-home-desktop.png",
};

const SCENE_STYLE = {
  "--header-height": "3.75rem",
  minHeight: "calc(100dvh - var(--header-height))",
};

/**
 * Full-page illustrated background — mobile portrait / desktop landscape.
 */
export default function StudentWorldScene({ children }) {
  return (
    <section
      className="relative flex min-h-0 w-full flex-1 flex-col"
      style={SCENE_STYLE}
      data-testid="student-world-scene"
    >
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat md:hidden"
        style={{ backgroundImage: `url('${STUDENT_WORLD_BG.mobile}')` }}
        aria-hidden
      />
      <div
        className="absolute inset-0 hidden bg-cover bg-center bg-no-repeat md:block"
        style={{ backgroundImage: `url('${STUDENT_WORLD_BG.desktop}')` }}
        aria-hidden
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
