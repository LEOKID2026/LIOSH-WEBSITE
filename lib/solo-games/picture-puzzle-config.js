/** @typedef {"placement" | "sliding"} PicturePuzzleMechanic */

/** Active mechanic — set to `sliding` to restore legacy sliding puzzle. */
export const ACTIVE_PICTURE_PUZZLE_MECHANIC = /** @type {PicturePuzzleMechanic} */ ("placement");

export const PICTURE_PUZZLE_MECHANICS = Object.freeze({
  PLACEMENT: "placement",
  SLIDING: "sliding",
});

/** 20 תמונות ייעודיות לפאזל — public/images/puzzle/ (חייבות 1024×1024 ריבוע) */
export const PUZZLE_IMAGES = Object.freeze([
  { id: "01-leo-class", label: "ליאו בשיעור", src: "/images/puzzle/01-leo-class.png" },
  { id: "02-leo-math", label: "ליאו בחשבון", src: "/images/puzzle/02-leo-math.png" },
  { id: "03-leo-reading", label: "ליאו קורא ספר", src: "/images/puzzle/03-leo-reading.png" },
  { id: "04-leo-science", label: "ליאו במעבדה", src: "/images/puzzle/04-leo-science.png" },
  { id: "05-leo-soccer", label: "ליאו בכדורגל", src: "/images/puzzle/05-leo-soccer.png" },
  { id: "06-leo-playground", label: "ליאו במגרש", src: "/images/puzzle/06-leo-playground.png" },
  { id: "07-leo-pool", label: "ליאו בבריכה", src: "/images/puzzle/07-leo-pool.png" },
  { id: "08-leo-beach", label: "ליאו בים", src: "/images/puzzle/08-leo-beach.png" },
  { id: "09-leo-picnic", label: "ליאו בפיקניק", src: "/images/puzzle/09-leo-picnic.png" },
  { id: "10-leo-scooter", label: "ליאו בקורקינט", src: "/images/puzzle/10-leo-scooter.png" },
  { id: "11-leo-frisbee", label: "ליאו בפריסבי", src: "/images/puzzle/11-leo-frisbee.png" },
  { id: "12-leo-forest", label: "ליאו ביער", src: "/images/puzzle/12-leo-forest.png" },
  { id: "13-leo-rain", label: "ליאו בגשם", src: "/images/puzzle/13-leo-rain.png" },
  { id: "14-leo-space", label: "ליאו בחלל", src: "/images/puzzle/14-leo-space.png" },
  { id: "15-leo-snow", label: "ליאו בשלג", src: "/images/puzzle/15-leo-snow.png" },
  { id: "16-leo-dogpark", label: "ליאו בגינת כלבים", src: "/images/puzzle/16-leo-dogpark.png" },
  { id: "17-leo-friend", label: "ליאו עם חבר", src: "/images/puzzle/17-leo-friend.png" },
  { id: "18-leo-bus", label: "ליאו באוטובוס", src: "/images/puzzle/18-leo-bus.png" },
  { id: "19-leo-bus-ride", label: "ליאו נוסע", src: "/images/puzzle/19-leo-bus-ride.png" },
  { id: "20-leo-train", label: "ליאו ברכבת", src: "/images/puzzle/20-leo-train.png" },
]);

export const SLIDING_DIFFICULTY_SETTINGS = Object.freeze({
  easy: { grid: 3, timeSec: 300, parMoves: 18, maxGridWidth: "max-w-[min(92vw,340px)]" },
  medium: { grid: 4, timeSec: 240, parMoves: 45, maxGridWidth: "max-w-[min(92vw,380px)]" },
  hard: { grid: 5, timeSec: 300, parMoves: 95, maxGridWidth: "max-w-[min(92vw,400px)]" },
});

export const PLACEMENT_DIFFICULTY_SETTINGS = Object.freeze({
  easy: { grid: 3, timeSec: 300, parMoves: 14, label: "3×3" },
  medium: { grid: 4, timeSec: 240, parMoves: 28, label: "4×4" },
  hard: { grid: 5, timeSec: 300, parMoves: 48, label: "5×5" },
});

export const PREVIEW_SWIPE_THRESHOLD_PX = 48;

export const PREVIEW_NAV_BTN_CLASS =
  "hidden sm:inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-white/40 bg-black/50 text-yellow-100 text-2xl leading-none min-h-11 min-w-11 hover:bg-black/70 disabled:opacity-30 disabled:pointer-events-none transition";
