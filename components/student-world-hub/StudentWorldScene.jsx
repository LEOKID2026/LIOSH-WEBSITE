export const STUDENT_WORLD_BG = {
  mobile: "/images/student-world/world-home-mobile.png",
  desktop: "/images/student-world/world-home-desktop.png",
};

/**
 * Full-page illustrated background — mobile portrait / desktop landscape.
 * Height comes from the Layout → main flex chain (flex-1 / min-h-0), not viewport units,
 * so header + footer + ad chrome stay visible without page scroll.
 */
export default function StudentWorldScene({ children }) {
  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-1 flex-col self-stretch"
      data-testid="student-world-scene"
    >
      <div
        className="pointer-events-none absolute inset-0 min-h-full bg-cover bg-center bg-no-repeat md:hidden"
        style={{ backgroundImage: `url('${STUDENT_WORLD_BG.mobile}')` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden min-h-full bg-cover bg-center bg-no-repeat md:block"
        style={{ backgroundImage: `url('${STUDENT_WORLD_BG.desktop}')` }}
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}
