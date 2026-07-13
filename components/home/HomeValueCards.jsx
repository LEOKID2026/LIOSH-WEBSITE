import { HOMEPAGE_COPY } from "../../data/home/homepage-copy.he";

const CARD_SHELLS_BRIGHT = [
  "from-teal-400 to-cyan-500",
  "from-violet-400 to-fuchsia-500",
  "from-amber-400 to-orange-500",
];

const CARD_SHELLS_CLASSIC = [
  "from-teal-500 to-cyan-600",
  "from-violet-500 to-fuchsia-600",
  "from-amber-500 to-orange-600",
];

/**
 * Three colorful value cards directly below the hero.
 * @param {{ isBright: boolean }} props
 */
export default function HomeValueCards({ isBright }) {
  const cards = HOMEPAGE_COPY.valueCards;
  const shells = isBright ? CARD_SHELLS_BRIGHT : CARD_SHELLS_CLASSIC;

  return (
    <section
      className="mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8"
      data-testid="home-value-cards"
      aria-label="ערכי המוצר"
    >
      <div className="grid gap-4 md:grid-cols-3 md:gap-5">
        {cards.map((card, index) => (
          <article
            key={card.title}
            className={`rounded-2xl bg-gradient-to-br ${shells[index % shells.length]} p-[2px] shadow-lg`}
            data-testid={`home-value-card-${index + 1}`}
          >
            <div
              className={`flex h-full flex-col gap-2 rounded-[14px] p-5 text-right md:p-6 ${
                isBright ? "bg-white/95" : "bg-[#0b1424]/90"
              }`}
            >
              <h3
                className={`text-lg font-black md:text-xl ${isBright ? "text-sky-900" : "text-sky-100"}`}
              >
                {card.title}
              </h3>
              <p
                className={`text-sm leading-relaxed md:text-base ${
                  isBright ? "text-slate-600" : "text-white/75"
                }`}
              >
                {card.text}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
