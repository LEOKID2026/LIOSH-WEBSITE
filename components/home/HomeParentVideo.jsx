import ParentPromoVideo from "../parent/ParentPromoVideo";
import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";
import { getHomeTextClasses } from "./home-theme";

/**
 * @param {{ isBright: boolean, featured?: boolean }} props
 */
export default function HomeParentVideo({ isBright, featured = false }) {
  const copy = HOMEPAGE_COPY.parentVideo;
  const cls = getHomeTextClasses(isBright);

  if (featured) {
    return (
      <section
        className={cls.featuredVideoShell}
        data-testid="home-parent-video"
        aria-label={copy.title}
      >
        <ParentPromoVideo
          isBright={isBright}
          title={copy.title}
          description={copy.description}
          featured
          className="py-0"
        />
      </section>
    );
  }

  return (
    <section data-testid="home-parent-video">
      <ParentPromoVideo
        isBright={isBright}
        title={copy.title}
        description={copy.description}
        className="py-2"
      />
    </section>
  );
}
