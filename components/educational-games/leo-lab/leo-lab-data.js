/** @typedef {'easy' | 'medium' | 'hard'} DifficultyId */

/** @typedef {{
 *   id: string
 *   name: string
 *   icon: string
 *   category?: string
 *   imageSrc?: string
 * }} LabItem */

/** @typedef {{
 *   id: string
 *   difficulty: DifficultyId
 *   title: string
 *   prompt: string
 *   missionIcon?: string
 *   pickCount: number
 *   validItems: string[]
 *   exactMatch?: boolean
 *   resultText: string
 *   fact: string
 *   resultIcon: string
 * }} LabExperiment */

export const EXPERIMENTS_PER_LEVEL = 20;

export const DIFFICULTIES = {
  easy: {
    id: "easy",
    label: "קל",
    shelfCount: 8,
    itemHint: "8 חפצים · בוחרים 2",
    maxMistakes: 6,
  },
  medium: {
    id: "medium",
    label: "בינוני",
    shelfCount: 12,
    itemHint: "12 חפצים · 2–3",
    maxMistakes: 5,
  },
  hard: {
    id: "hard",
    label: "קשה",
    shelfCount: 12,
    itemHint: "12 חפצים · 2–4",
    maxMistakes: 4,
  },
};

/** @type {Record<string, LabItem>} */
export const LAB_ITEMS = {
  water: { id: "water", name: "מים", icon: "💧", category: "נוזל" },
  wood: { id: "wood", name: "עץ", icon: "🪵", category: "מוצק" },
  nail: { id: "nail", name: "מסמר", icon: "🔩", category: "מתכת" },
  magnet: { id: "magnet", name: "מגנט", icon: "🧲", category: "מגנט" },
  plant: { id: "plant", name: "צמח", icon: "🌱", category: "חי" },
  mirror: { id: "mirror", name: "מראה", icon: "🪞", category: "אור" },
  light: { id: "light", name: "אור", icon: "🔦", category: "אור" },
  ice: { id: "ice", name: "קרח", icon: "🧊", category: "קר" },
  battery: { id: "battery", name: "סוללה", icon: "🔋", category: "חשמל" },
  bulb: { id: "bulb", name: "נורה", icon: "💡", category: "חשמל" },
  wire: { id: "wire", name: "חוט", icon: "🧵", category: "חשמל" },
  sun: { id: "sun", name: "שמש", icon: "☀️", category: "אור" },
  soil: { id: "soil", name: "אדמה", icon: "🟫", category: "טבע" },
  bowl: { id: "bowl", name: "קערה", icon: "🥣", category: "כלי" },
  stone: { id: "stone", name: "אבן", icon: "🪨", category: "מוצק" },
  wall: { id: "wall", name: "קיר", icon: "🧱", category: "מוצק" },
  switch: { id: "switch", name: "מתג", icon: "🎛️", category: "חשמל" },
  metal_spoon: { id: "metal_spoon", name: "כפית מתכת", icon: "🥄", category: "מתכת" },
  plastic: { id: "plastic", name: "פלסטיק", icon: "🧴", category: "חומר" },
  paper: { id: "paper", name: "נייר", icon: "📄", category: "חומר" },
  can: { id: "can", name: "פחית", icon: "🥫", category: "מתכת" },
  key: { id: "key", name: "מפתח", icon: "🔑", category: "מתכת" },
};

/** @type {Record<DifficultyId, string[]>} */
export const SHELF_BY_DIFFICULTY = {
  easy: ["magnet", "nail", "metal_spoon", "can", "plant", "water", "sun", "wood"],
  medium: [
    "battery",
    "bulb",
    "wire",
    "magnet",
    "nail",
    "metal_spoon",
    "plant",
    "water",
    "sun",
    "ice",
    "bowl",
    "mirror",
  ],
  hard: [
    "battery",
    "bulb",
    "wire",
    "switch",
    "magnet",
    "nail",
    "metal_spoon",
    "plant",
    "water",
    "sun",
    "soil",
    "stone",
  ],
};

/** @type {LabExperiment[]} */
export const EASY_EXPERIMENTS = [
  {
    id: "easy-magnet-metals",
    difficulty: "easy",
    title: "מצאו חפצים שנמשכים למגנט",
    prompt: "בחרו 2 חפצים מתכתיים שהמגנט ימשוך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["magnet", "nail", "metal_spoon", "can"],
    resultText: "מעולה! המגנט מושך מתכות.",
    fact: "מגנט מושך חלק מהמתכות.",
    resultIcon: "✨",
  },
  {
    id: "easy-plant-drink",
    difficulty: "easy",
    title: "עזרו לצמח לשתות",
    prompt: "בחרו 2 דברים שיעזרו לצמח",
    missionIcon: "🌱",
    pickCount: 2,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! הצמח שותה וגדל.",
    fact: "לצמחים צריך מים כדי לגדול.",
    resultIcon: "💧",
  },
  {
    id: "easy-warm-water",
    difficulty: "easy",
    title: "המיסו את הקרח",
    prompt: "בחרו 2 דברים שיעזרו לקרח להימס",
    missionIcon: "🧊",
    pickCount: 2,
    validItems: ["sun", "water", "plant", "wood"],
    resultText: "מעולה! חום ומים עוזרים לקרח להימס.",
    fact: "חום גורם לקרח להפוך למים.",
    resultIcon: "💦",
  },
  {
    id: "easy-shadow",
    difficulty: "easy",
    title: "צרו צל",
    prompt: "בחרו 2 חפצים שיוצרים צל",
    missionIcon: "🌓",
    pickCount: 2,
    validItems: ["sun", "wood", "magnet", "plant"],
    resultText: "מעולה! נוצר צל.",
    fact: "גוף אטום חוסם אור ויוצר צל.",
    resultIcon: "🌑",
  },
  {
    id: "easy-float",
    difficulty: "easy",
    title: "בדקו מה צף במים",
    prompt: "בחרו 2 חפצים לבדיקת ציפה במים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "wood", "plant", "can"],
    resultText: "מעולה! העץ צף על המים.",
    fact: "חומרים קלים יותר מהמים עלולים לצוף.",
    resultIcon: "🪵",
  },
  {
    id: "easy-sink",
    difficulty: "easy",
    title: "בדקו מה שוקע במים",
    prompt: "בחרו 2 חפצים כבדים לבדיקה במים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "nail", "metal_spoon", "can"],
    resultText: "מעולה! המתכת שוקעת.",
    fact: "חומרים כבדים יותר מהמים עלולים לשקוע.",
    resultIcon: "🪨",
  },
  {
    id: "easy-reflect",
    difficulty: "easy",
    title: "החזירו אור",
    prompt: "בחרו 2 חפצים שקשורים לאור",
    missionIcon: "🔦",
    pickCount: 2,
    validItems: ["sun", "water", "magnet", "wood"],
    resultText: "מעולה! השמש מאירה.",
    fact: "מקור אור מאיר את הסביבה.",
    resultIcon: "🌟",
  },
  {
    id: "easy-water-fit",
    difficulty: "easy",
    title: "בחרו חפצים שמתאימים למים",
    prompt: "בחרו 2 חפצים לניסוי עם מים",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "wood", "plant", "can"],
    resultText: "מעולה! אפשר לבדוק במים.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🧪",
  },
  {
    id: "easy-plant-three",
    difficulty: "easy",
    title: "הזינו צמח",
    prompt: "בחרו 3 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! לצמח יש מים ואור.",
    fact: "צמח צריך מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "easy-light-three",
    difficulty: "easy",
    title: "האירו את החדר",
    prompt: "בחרו 3 חפצים שקשורים לאור",
    missionIcon: "☀️",
    pickCount: 3,
    validItems: ["sun", "water", "plant", "magnet"],
    resultText: "מעולה! האור מאיר.",
    fact: "מקור אור מאיר את הסביבה.",
    resultIcon: "🌟",
  },
  {
    id: "easy-metal-three",
    difficulty: "easy",
    title: "אספו מתכות",
    prompt: "בחרו 3 חפצים מתכתיים",
    missionIcon: "🧲",
    pickCount: 3,
    validItems: ["magnet", "nail", "metal_spoon", "can"],
    resultText: "מעולה! אלה חפצים מתכתיים.",
    fact: "מגנט מושך חלק מהמתכות.",
    resultIcon: "🔩",
  },
  {
    id: "easy-sun-for-plant",
    difficulty: "easy",
    title: "אור לצמח",
    prompt: "בחרו 2 דברים שהצמח צריך לאור",
    missionIcon: "☀️",
    pickCount: 2,
    validItems: ["plant", "sun", "water", "wood"],
    resultText: "מעולה! לצמח יש אור.",
    fact: "צמחים צריכים אור כדי לגדול.",
    resultIcon: "🌞",
  },
  {
    id: "easy-water-the-plant",
    difficulty: "easy",
    title: "השקיית צמח",
    prompt: "בחרו 2 דברים להשקיית הצמח",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! הצמח קיבל מים.",
    fact: "מים עוזרים לשורשים לספוג חומרים.",
    resultIcon: "🌱",
  },
  {
    id: "easy-can-in-water",
    difficulty: "easy",
    title: "פחית במים",
    prompt: "בחרו 2 חפצים לבדיקת פחית במים",
    missionIcon: "🥫",
    pickCount: 2,
    validItems: ["water", "can", "nail", "wood"],
    resultText: "מעולה! הפחית שקעה במים.",
    fact: "פחית מתכתית כבדה ולרוב שוקעת.",
    resultIcon: "💧",
  },
  {
    id: "easy-wood-float-test",
    difficulty: "easy",
    title: "עץ על המים",
    prompt: "בחרו 2 חפצים לניסוי עם עץ ומים",
    missionIcon: "🪵",
    pickCount: 2,
    validItems: ["wood", "water", "plant", "can"],
    resultText: "מעולה! העץ צף על פני המים.",
    fact: "עץ קל יחסית ולכן עלול לצוף.",
    resultIcon: "🌊",
  },
  {
    id: "easy-nail-magnet-pair",
    difficulty: "easy",
    title: "מסמר ומגנט",
    prompt: "בחרו 2 חפצים לבדיקת מסמר ומגנט",
    missionIcon: "🔩",
    pickCount: 2,
    validItems: ["magnet", "nail", "metal_spoon", "can"],
    resultText: "מעולה! המסמר נמשך למגנט.",
    fact: "מסמר ממתכת נמשך למגנט.",
    resultIcon: "🧲",
  },
  {
    id: "easy-spoon-in-water",
    difficulty: "easy",
    title: "כפית במים",
    prompt: "בחרו 2 חפצים לבדיקת כפית מתכת במים",
    missionIcon: "🥄",
    pickCount: 2,
    validItems: ["metal_spoon", "water", "nail", "can"],
    resultText: "מעולה! הכפית שקעה במים.",
    fact: "כפית מתכתית כבדה ולרוב שוקעת.",
    resultIcon: "💧",
  },
  {
    id: "easy-sun-and-water",
    difficulty: "easy",
    title: "שמש ומים",
    prompt: "בחרו 2 דברים שמשפיעים על גידול הצמח",
    missionIcon: "🌤️",
    pickCount: 2,
    validItems: ["sun", "water", "plant", "wood"],
    resultText: "מעולה! שמש ומים עוזרים לצמח.",
    fact: "שמש ומים חשובים לגידול צמחים.",
    resultIcon: "🌿",
  },
  {
    id: "easy-can-magnet-pull",
    difficulty: "easy",
    title: "פחית נמשכת",
    prompt: "בחרו 2 חפצים עם פחית ומגנט",
    missionIcon: "🥫",
    pickCount: 2,
    validItems: ["magnet", "can", "nail", "metal_spoon"],
    resultText: "מעולה! הפחית נמשכה למגנט.",
    fact: "פחית ממתכת נמשכת למגנט.",
    resultIcon: "🧲",
  },
  {
    id: "easy-heavy-things",
    difficulty: "easy",
    title: "חפצים כבדים",
    prompt: "בחרו 2 חפצים כבדים מהמדף",
    missionIcon: "⚖️",
    pickCount: 2,
    validItems: ["nail", "can", "metal_spoon", "water"],
    resultText: "מעולה! אלה חפצים כבדים.",
    fact: "מתכות לרוב כבדות יותר מעץ.",
    resultIcon: "🪨",
  },
  {
    id: "easy-light-things",
    difficulty: "easy",
    title: "חפצים קלים",
    prompt: "בחרו 2 חפצים קלים מהמדף",
    missionIcon: "🪶",
    pickCount: 2,
    validItems: ["wood", "plant", "water", "sun"],
    resultText: "מעולה! אלה חפצים קלים יותר.",
    fact: "עץ וצמח קלים יותר ממתכת.",
    resultIcon: "🍃",
  },
  {
    id: "easy-morning-garden",
    difficulty: "easy",
    title: "גינה בבוקר",
    prompt: "בחרו 3 דברים לטיפול בגינה",
    missionIcon: "🌻",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "wood"],
    resultText: "מעולה! הגינה מקבלת טיפול.",
    fact: "גינה צריכה מים, אור וטיפול.",
    resultIcon: "🌻",
  },
];

/** @type {LabExperiment[]} */
export const MEDIUM_EXPERIMENTS = [
  {
    id: "medium-light-bulb",
    difficulty: "medium",
    title: "הדליקו את הנורה",
    prompt: "בחרו 3 חפצים שיסגרו מעגל וידליקו נורה",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["battery", "bulb", "wire", "magnet", "bowl"],
    resultText: "מעולה! המעגל נסגר והנורה נדלקה.",
    fact: "כדי שנורה תידלק צריך מקור חשמל ומעגל סגור.",
    resultIcon: "💡",
  },
  {
    id: "medium-plant-grow",
    difficulty: "medium",
    title: "עזרו לצמח לגדול",
    prompt: "בחרו 3 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "bowl", "ice"],
    resultText: "מעולה! הצמח מקבל מים ואור.",
    fact: "צמחים צריכים מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "medium-light-target",
    difficulty: "medium",
    title: "כוונו אור למטרה",
    prompt: "בחרו 3 חפצים שיכוונו אור",
    missionIcon: "🎯",
    pickCount: 3,
    validItems: ["mirror", "sun", "water", "bowl", "ice"],
    resultText: "מעולה! האור הוחזר למקום הנכון.",
    fact: "מראה יכולה להסיט קרני אור.",
    resultIcon: "🪞",
  },
  {
    id: "medium-melt-bowl",
    difficulty: "medium",
    title: "המיסו קרח בקערה",
    prompt: "בחרו 3 חפצים להמסת קרח",
    missionIcon: "🧊",
    pickCount: 3,
    validItems: ["ice", "bowl", "sun", "water", "plant"],
    resultText: "מעולה! הקרח נמס בקערה.",
    fact: "חום מעביר קרח ממצב מוצק למים.",
    resultIcon: "💦",
  },
  {
    id: "medium-magnet-pick2",
    difficulty: "medium",
    title: "בדקו אילו חפצים נמשכים למגנט",
    prompt: "בחרו 2 מתכות שהמגנט מושך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["nail", "metal_spoon", "magnet"],
    resultText: "מעולה! המגנט מושך מתכות.",
    fact: "לא כל החומרים נמשכים למגנט.",
    resultIcon: "🔩",
  },
  {
    id: "medium-simple-circuit",
    difficulty: "medium",
    title: "בנו מעגל פשוט",
    prompt: "בחרו 3 חפצים למעגל חשמלי",
    missionIcon: "🔋",
    pickCount: 3,
    validItems: ["battery", "wire", "bulb", "magnet", "mirror"],
    resultText: "מעולה! המעגל סגור והנורה דולקת.",
    fact: "זרם חשמלי זורם במעגל סגור.",
    resultIcon: "⚡",
  },
  {
    id: "medium-clear-shadow",
    difficulty: "medium",
    title: "צרו צל ברור",
    prompt: "בחרו 3 חפצים שייצרו צל",
    missionIcon: "🌓",
    pickCount: 3,
    validItems: ["sun", "plant", "bowl", "ice", "water"],
    resultText: "מעולה! צל ברור נוצר.",
    fact: "צל נוצר כשגוף חוסם את האור.",
    resultIcon: "🌑",
  },
  {
    id: "medium-plant-place",
    difficulty: "medium",
    title: "השקו צמח במקום מתאים",
    prompt: "בחרו 3 דברים לגידול צמח",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun", "bowl", "ice"],
    resultText: "מעולה! לצמח יש מה שהוא צריך.",
    fact: "רוב הצמחים גדלים טוב עם מים ואור.",
    resultIcon: "🟫",
  },
  {
    id: "medium-mirror-sun",
    difficulty: "medium",
    title: "החזרת אור במראה",
    prompt: "בחרו 2 חפצים להחזרת אור",
    missionIcon: "🪞",
    pickCount: 2,
    validItems: ["mirror", "sun", "water", "bowl"],
    resultText: "מעולה! המראה מחזירה אור.",
    fact: "מראה חלקה יכולה להחזיר קרני אור.",
    resultIcon: "✨",
  },
  {
    id: "medium-float-two",
    difficulty: "medium",
    title: "מה יצוף במים?",
    prompt: "בחרו 2 חפצים לבדיקת ציפה",
    missionIcon: "💧",
    pickCount: 2,
    validItems: ["water", "bowl", "ice", "plant"],
    resultText: "מעולה! אפשר לבדוק במים.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🪵",
  },
  {
    id: "medium-battery-bulb-pair",
    difficulty: "medium",
    title: "סוללה ונורה",
    prompt: "בחרו 2 חפצים לחיבור חשמלי",
    missionIcon: "🔋",
    pickCount: 2,
    validItems: ["battery", "bulb", "wire", "magnet"],
    resultText: "מעולה! סוללה ונורה מתחברים.",
    fact: "נורה צריכה מקור חשמל.",
    resultIcon: "💡",
  },
  {
    id: "medium-ice-melt-two",
    difficulty: "medium",
    title: "המסת קרח",
    prompt: "בחרו 2 חפצים להמסת קרח",
    missionIcon: "🧊",
    pickCount: 2,
    validItems: ["ice", "sun", "bowl", "water"],
    resultText: "מעולה! הקרח מתחיל להימס.",
    fact: "חום גורם לקרח להפוך למים.",
    resultIcon: "💦",
  },
  {
    id: "medium-bowl-water-two",
    difficulty: "medium",
    title: "קערה עם מים",
    prompt: "בחרו 2 חפצים לניסוי בקערה",
    missionIcon: "🥣",
    pickCount: 2,
    validItems: ["bowl", "water", "ice", "plant"],
    resultText: "מעולה! הקערה מוכנה לניסוי.",
    fact: "קערה יכולה להחזיק מים לניסוי.",
    resultIcon: "🧪",
  },
  {
    id: "medium-wire-bulb-two",
    difficulty: "medium",
    title: "חוט ונורה",
    prompt: "בחרו 2 חפצים להעברת חשמל",
    missionIcon: "🧵",
    pickCount: 2,
    validItems: ["wire", "bulb", "battery", "mirror"],
    resultText: "מעולה! חוט מחבר את הנורה.",
    fact: "חוט מוליך חשמל במעגל.",
    resultIcon: "⚡",
  },
  {
    id: "medium-plant-sun-two",
    difficulty: "medium",
    title: "צמח באור",
    prompt: "בחרו 2 דברים לצמיחה באור",
    missionIcon: "🌱",
    pickCount: 2,
    validItems: ["plant", "sun", "water", "bowl"],
    resultText: "מעולה! לצמח יש אור.",
    fact: "צמחים גדלים טוב עם אור.",
    resultIcon: "🌿",
  },
  {
    id: "medium-reflect-three",
    difficulty: "medium",
    title: "ניסוי החזרה",
    prompt: "בחרו 3 חפצים להחזרת אור",
    missionIcon: "🪞",
    pickCount: 3,
    validItems: ["mirror", "sun", "water", "bowl"],
    resultText: "מעולה! האור הוחזר.",
    fact: "מראה מסיטה קרני אור.",
    resultIcon: "✨",
  },
  {
    id: "medium-ice-bowl-three",
    difficulty: "medium",
    title: "קרח בקערה",
    prompt: "בחרו 3 חפצים להמסת קרח בקערה",
    missionIcon: "🧊",
    pickCount: 3,
    validItems: ["ice", "bowl", "sun", "water"],
    resultText: "מעולה! הקרח נמס בקערה.",
    fact: "חום מעביר קרח ממצב מוצק למים.",
    resultIcon: "💦",
  },
  {
    id: "medium-circuit-three",
    difficulty: "medium",
    title: "מעגל עם נורה",
    prompt: "בחרו 3 חפצים להדלקת נורה",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["battery", "bulb", "wire", "magnet"],
    resultText: "מעולה! הנורה נדלקה.",
    fact: "מעגל סגור מעביר זרם חשמלי.",
    resultIcon: "⚡",
  },
  {
    id: "medium-shadow-three",
    difficulty: "medium",
    title: "צל על הקיר",
    prompt: "בחרו 3 חפצים ליצירת צל",
    missionIcon: "🌓",
    pickCount: 3,
    validItems: ["sun", "plant", "bowl", "mirror"],
    resultText: "מעולה! נוצר צל ברור.",
    fact: "גוף אטום חוסם אור ויוצר צל.",
    resultIcon: "🌑",
  },
  {
    id: "medium-water-plant-three",
    difficulty: "medium",
    title: "השקיית צמח בקערה",
    prompt: "בחרו 3 דברים להשקיית צמח",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "bowl", "sun"],
    resultText: "מעולה! הצמח הושקה.",
    fact: "צמחים צריכים מים באופן קבוע.",
    resultIcon: "💧",
  },
  {
    id: "medium-magnet-key-two",
    difficulty: "medium",
    title: "מתכת על המדף",
    prompt: "בחרו 2 חפצים מתכתיים מהמדף",
    missionIcon: "🔩",
    pickCount: 2,
    validItems: ["nail", "metal_spoon", "magnet", "bowl"],
    resultText: "מעולה! אלה חפצים מתכתיים.",
    fact: "מסמר וכפית עשויים ממתכת.",
    resultIcon: "🥄",
  },
  {
    id: "medium-sun-ice-two",
    difficulty: "medium",
    title: "שמש ממיסה",
    prompt: "בחרו 2 חפצים להמסה באור שמש",
    missionIcon: "☀️",
    pickCount: 2,
    validItems: ["sun", "ice", "bowl", "water"],
    resultText: "מעולה! השמש מחממת.",
    fact: "אור השמש מספק חום.",
    resultIcon: "🌡️",
  },
];

/** @type {LabExperiment[]} */
export const HARD_EXPERIMENTS = [
  {
    id: "hard-bulb-clean",
    difficulty: "hard",
    title: "הדליקו נורה בלי לבחור חפץ שלא עוזר",
    prompt: "בחרו בדיוק 3 חפצים למעגל חשמלי",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["battery", "wire", "bulb"],
    exactMatch: true,
    resultText: "מעולה! מעגל נקי ונורה דולקת.",
    fact: "חשמל זורם במתכות ובחומרים מוליכים.",
    resultIcon: "💡",
  },
  {
    id: "hard-plant-full",
    difficulty: "hard",
    title: "הכינו צמח לגדילה טובה",
    prompt: "בחרו בדיוק 4 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 4,
    validItems: ["plant", "soil", "water", "sun"],
    exactMatch: true,
    resultText: "מעולה! לצמח יש הכל לגדילה.",
    fact: "צמח צריך אדמה, מים, אור ואוויר.",
    resultIcon: "🌿",
  },
  {
    id: "hard-light-reflection",
    difficulty: "hard",
    title: "צרו ניסוי שמראה החזרת אור",
    prompt: "בחרו בדיוק 3 חפצים להחזרת אור",
    missionIcon: "🪞",
    pickCount: 3,
    validItems: ["sun", "magnet", "nail"],
    exactMatch: true,
    resultText: "מעולה! רואים איך האור פועל.",
    fact: "מקור אור מאיר חפצים מסביב.",
    resultIcon: "🌟",
  },
  {
    id: "hard-magnet-exact2",
    difficulty: "hard",
    title: "בדקו מה מגנט מושך ומה לא",
    prompt: "בחרו בדיוק 2 מתכות שהמגנט מושך",
    missionIcon: "🧲",
    pickCount: 2,
    validItems: ["nail", "metal_spoon"],
    exactMatch: true,
    resultText: "מעולה! שתי המתכות נמשכות.",
    fact: "מגנט לא מושך אבן או צמח.",
    resultIcon: "🔩",
  },
  {
    id: "hard-melt-exact",
    difficulty: "hard",
    title: "המיסו קרח בצורה נכונה",
    prompt: "בחרו בדיוק 3 חפצים להמסת קרח",
    missionIcon: "🧊",
    pickCount: 3,
    validItems: ["sun", "water", "stone"],
    exactMatch: true,
    resultText: "מעולה! חום ומים עוזרים.",
    fact: "חום מעביר חומר ממצב אחד לאחר.",
    resultIcon: "💦",
  },
  {
    id: "hard-full-circuit",
    difficulty: "hard",
    title: "בנו מעגל חשמלי מלא",
    prompt: "בחרו בדיוק 4 חפצים למעגל עם מתג",
    missionIcon: "⚡",
    pickCount: 4,
    validItems: ["battery", "wire", "bulb", "switch"],
    exactMatch: true,
    resultText: "מעולה! מעגל מלא עם מתג.",
    fact: "מתג שולט בזרימת החשמל במעגל.",
    resultIcon: "🎛️",
  },
  {
    id: "hard-shadow-exact",
    difficulty: "hard",
    title: "צרו צל בעזרת חפץ מתאים",
    prompt: "בחרו בדיוק 3 חפצים ליצירת צל",
    missionIcon: "🌓",
    pickCount: 3,
    validItems: ["sun", "plant", "stone"],
    exactMatch: true,
    resultText: "מעולה! צל ברור נוצר.",
    fact: "רק גוף אטום יוצר צל.",
    resultIcon: "🌑",
  },
  {
    id: "hard-water-exact",
    difficulty: "hard",
    title: "בחרו רק חומרים שמתאימים לניסוי במים",
    prompt: "בחרו בדיוק 3 חפצים לניסוי במים",
    missionIcon: "💧",
    pickCount: 3,
    validItems: ["water", "plant", "stone"],
    exactMatch: true,
    resultText: "מעולה! אפשר לבדוק צף ושוקע.",
    fact: "במים בודקים אם חומר צף או שוקע.",
    resultIcon: "🪵",
  },
  {
    id: "hard-soil-plant-exact",
    difficulty: "hard",
    title: "שתילה באדמה",
    prompt: "בחרו בדיוק 2 חפצים לשתילה",
    missionIcon: "🟫",
    pickCount: 2,
    validItems: ["plant", "soil"],
    exactMatch: true,
    resultText: "מעולה! הצמח שתול באדמה.",
    fact: "שורשים גדלים טוב באדמה.",
    resultIcon: "🌱",
  },
  {
    id: "hard-stone-sinks-exact",
    difficulty: "hard",
    title: "אבן שוקעת",
    prompt: "בחרו בדיוק 2 חפצים לבדיקת שקיעה",
    missionIcon: "🪨",
    pickCount: 2,
    validItems: ["water", "stone"],
    exactMatch: true,
    resultText: "מעולה! האבן שוקעת במים.",
    fact: "אבן כבדה ולרוב שוקעת במים.",
    resultIcon: "💧",
  },
  {
    id: "hard-sun-plant-exact",
    difficulty: "hard",
    title: "אנרגיית שמש",
    prompt: "בחרו בדיוק 2 חפצים לגידול באור",
    missionIcon: "☀️",
    pickCount: 2,
    validItems: ["sun", "plant"],
    exactMatch: true,
    resultText: "מעולה! השמש מאירה על הצמח.",
    fact: "צמחים משתמשים באור השמש.",
    resultIcon: "🌞",
  },
  {
    id: "hard-spoon-nail-exact",
    difficulty: "hard",
    title: "שתי מתכות",
    prompt: "בחרו בדיוק 2 מתכות מהמדף",
    missionIcon: "🔩",
    pickCount: 2,
    validItems: ["metal_spoon", "nail"],
    exactMatch: true,
    resultText: "מעולה! שתי המתכות נבחרו.",
    fact: "מסמר וכפית הם חפצים מתכתיים.",
    resultIcon: "🥄",
  },
  {
    id: "hard-plant-needs-exact",
    difficulty: "hard",
    title: "צמח זקוק ל",
    prompt: "בחרו בדיוק 3 דברים שהצמח צריך",
    missionIcon: "🌱",
    pickCount: 3,
    validItems: ["plant", "water", "sun"],
    exactMatch: true,
    resultText: "מעולה! לצמח יש מה שהוא צריך.",
    fact: "צמח צריך מים ואור לגדול.",
    resultIcon: "🌿",
  },
  {
    id: "hard-switch-path-exact",
    difficulty: "hard",
    title: "נתיב עם מתג",
    prompt: "בחרו בדיוק 3 חפצים למעגל עם מתג",
    missionIcon: "🎛️",
    pickCount: 3,
    validItems: ["switch", "wire", "battery"],
    exactMatch: true,
    resultText: "מעולה! המתג שולט בזרם.",
    fact: "מתג פותח או סוגר מעגל חשמלי.",
    resultIcon: "⚡",
  },
  {
    id: "hard-natural-four-exact",
    difficulty: "hard",
    title: "חומרים בטבע",
    prompt: "בחרו בדיוק 4 חפצים מעולם הטבע",
    missionIcon: "🌍",
    pickCount: 4,
    validItems: ["stone", "soil", "water", "sun"],
    exactMatch: true,
    resultText: "מעולה! אלה חומרים טבעיים.",
    fact: "בטבע מוצאים אבן, אדמה, מים ואור.",
    resultIcon: "🌿",
  },
  {
    id: "hard-metals-water-exact",
    difficulty: "hard",
    title: "מתכות במים",
    prompt: "בחרו בדיוק 4 חפצים לניסוי מתכות במים",
    missionIcon: "🧲",
    pickCount: 4,
    validItems: ["water", "nail", "metal_spoon", "magnet"],
    exactMatch: true,
    resultText: "מעולה! בודקים מתכות במים.",
    fact: "מתכות מתנהגות אחרת מעץ במים.",
    resultIcon: "💧",
  },
  {
    id: "hard-garden-day-exact",
    difficulty: "hard",
    title: "יום בגינה",
    prompt: "בחרו בדיוק 4 חפצים ליום גינה",
    missionIcon: "🌻",
    pickCount: 4,
    validItems: ["sun", "plant", "water", "soil"],
    exactMatch: true,
    resultText: "מעולה! הגינה מוכנה לגדול.",
    fact: "גינה צריכה אור, מים, אדמה וצמח.",
    resultIcon: "🌻",
  },
  {
    id: "hard-wire-bulb-exact",
    difficulty: "hard",
    title: "חיבור נורה",
    prompt: "בחרו בדיוק 3 חפצים לחיבור נורה",
    missionIcon: "💡",
    pickCount: 3,
    validItems: ["wire", "bulb", "battery"],
    exactMatch: true,
    resultText: "מעולה! הנורה מחוברת.",
    fact: "נורה דולקת כשזורם בה חשמל.",
    resultIcon: "⚡",
  },
  {
    id: "hard-magnet-stone-exact",
    difficulty: "hard",
    title: "מה לא נמשך",
    prompt: "בחרו בדיוק 3 חפצים לבדיקת מגנט",
    missionIcon: "🧲",
    pickCount: 3,
    validItems: ["magnet", "nail", "stone"],
    exactMatch: true,
    resultText: "מעולה! רואים מה נמשך ומה לא.",
    fact: "מגנט לא מושך אבן.",
    resultIcon: "🪨",
  },
  {
    id: "hard-soil-water-exact",
    difficulty: "hard",
    title: "אדמה ומים",
    prompt: "בחרו בדיוק 3 חפצים לניסוי עם אדמה",
    missionIcon: "🟫",
    pickCount: 3,
    validItems: ["soil", "water", "plant"],
    exactMatch: true,
    resultText: "מעולה! האדמה לחה ומוכנה.",
    fact: "אדמה לחה עוזרת לצמחים לגדול.",
    resultIcon: "💧",
  },
];

/** @type {Record<DifficultyId, LabExperiment[]>} */
export const EXPERIMENTS_BY_DIFFICULTY = {
  easy: EASY_EXPERIMENTS,
  medium: MEDIUM_EXPERIMENTS,
  hard: HARD_EXPERIMENTS,
};

export const SCORE = {
  correct: 30,
  firstTry: 10,
  streak3: 15,
  streak5: 30,
};

/** @param {DifficultyId} difficulty @param {number} index 0-based run index */
export function pickCountForRunIndex(difficulty, index) {
  if (difficulty === "easy") {
    if (index < 10) return 2;
    if (index < 18) return 2;
    return 3;
  }
  if (difficulty === "medium") {
    return index < 10 ? 2 : 3;
  }
  if (index < 5) return 2;
  if (index < 15) return 3;
  return 4;
}

/** @param {LabExperiment} exp */
function experimentRunKey(exp) {
  return `${exp.title.trim()}|${exp.prompt.trim()}`;
}

/** Fisher–Yates shuffle */
function shuffleExperiments(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * @param {DifficultyId} difficulty
 * @returns {LabExperiment[]}
 */
export function pickExperimentsForRun(difficulty) {
  const pool = EXPERIMENTS_BY_DIFFICULTY[difficulty] ?? EASY_EXPERIMENTS;

  /** @type {Record<number, LabExperiment[]>} */
  const byPick = {};
  for (const exp of pool) {
    if (!byPick[exp.pickCount]) byPick[exp.pickCount] = [];
    byPick[exp.pickCount].push(exp);
  }
  for (const pickCount of Object.keys(byPick)) {
    byPick[Number(pickCount)] = shuffleExperiments(byPick[Number(pickCount)]);
  }

  const usedIds = new Set();
  const usedKeys = new Set();
  /** @type {LabExperiment[]} */
  const run = [];
  /** @type {Record<number, number>} */
  const bucketIdx = {};

  for (let i = 0; i < EXPERIMENTS_PER_LEVEL; i += 1) {
    const neededPick = pickCountForRunIndex(difficulty, i);
    const bucket = byPick[neededPick] ?? [];
    if (bucketIdx[neededPick] == null) bucketIdx[neededPick] = 0;

    let exp = null;
    while (bucketIdx[neededPick] < bucket.length) {
      const candidate = bucket[bucketIdx[neededPick]];
      bucketIdx[neededPick] += 1;
      if (usedIds.has(candidate.id) || usedKeys.has(experimentRunKey(candidate))) continue;
      exp = candidate;
      break;
    }

    if (!exp) break;

    usedIds.add(exp.id);
    usedKeys.add(experimentRunKey(exp));
    run.push({ ...exp });
  }

  return run;
}

/** @returns {Record<DifficultyId, { total: number, uniqueTitles: number, uniquePrompts: number, byPickCount: Record<number, number> }>} */
export function experimentPoolStats() {
  /** @type {Record<string, { total: number, uniqueTitles: number, uniquePrompts: number, byPickCount: Record<number, number> }>} */
  const stats = {};
  for (const [diff, list] of Object.entries(EXPERIMENTS_BY_DIFFICULTY)) {
    /** @type {Record<number, number>} */
    const byPickCount = {};
    for (const exp of list) {
      byPickCount[exp.pickCount] = (byPickCount[exp.pickCount] || 0) + 1;
    }
    stats[diff] = {
      total: list.length,
      uniqueTitles: new Set(list.map((e) => e.title.trim())).size,
      uniquePrompts: new Set(list.map((e) => e.prompt.trim())).size,
      byPickCount,
    };
  }
  return stats;
}

/**
 * @param {number} successfulExperiments
 * @param {number} experimentsTotal
 * @param {number} mistakes
 * @param {number} maxMistakes
 */
export function isLabWin(successfulExperiments, experimentsTotal, mistakes, maxMistakes) {
  if (mistakes > maxMistakes) return false;
  return successfulExperiments >= experimentsTotal;
}

/**
 * @param {DifficultyId} difficulty
 * @returns {LabItem[]}
 */
export function shelfItemsForDifficulty(difficulty) {
  const ids = SHELF_BY_DIFFICULTY[difficulty] ?? SHELF_BY_DIFFICULTY.easy;
  return ids.map((id) => LAB_ITEMS[id]).filter(Boolean);
}

/**
 * @param {string[]} selectedIds
 * @param {LabExperiment} experiment
 */
export function validateExperimentSelection(selectedIds, experiment) {
  const pickCount = experiment.pickCount;
  const validSet = new Set(experiment.validItems);
  const selected = [...selectedIds];

  if (selected.length < pickCount) {
    const allValid = selected.every((id) => validSet.has(id));
    if (allValid && selected.length > 0) {
      return { ok: false, reason: "partial" };
    }
    return { ok: false, reason: "missing" };
  }

  if (selected.length > pickCount) {
    return { ok: false, reason: "too_many" };
  }

  const wrong = selected.filter((id) => !validSet.has(id));
  if (wrong.length > 0) {
    return { ok: false, reason: "wrong" };
  }

  if (experiment.exactMatch) {
    const selectedSet = new Set(selected);
    const exactOk =
      experiment.validItems.length === pickCount &&
      experiment.validItems.every((id) => selectedSet.has(id));
    if (!exactOk) {
      return { ok: false, reason: "wrong" };
    }
    return { ok: true, reason: "success" };
  }

  return { ok: true, reason: "success" };
}

/**
 * @param {string} reason
 */
export function feedbackMessageForReason(reason, pickCount) {
  switch (reason) {
    case "missing":
      return `בחרו ${pickCount} חפצים לניסוי`;
    case "partial":
      return `בחרו ${pickCount} חפצים לניסוי`;
    case "wrong":
      return "כמעט! משהו בבחירה לא מתאים";
    case "too_many":
      return `בחרו ${pickCount} חפצים לניסוי`;
    default:
      return "נסו לבחור חפצים שמתאימים למשימה";
  }
}

/** @param {boolean} firstTry */
export function successFeedbackMessage(firstTry) {
  return firstTry ? "יפה! בחרת חפצים מתאימים" : "מעולה! הניסוי הצליח";
}
