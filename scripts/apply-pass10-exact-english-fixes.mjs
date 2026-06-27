/**
 * PASS 10 exact English fixes.
 * Applies full-page replacements only to english-g1 / english-g2 pages under exports/audio-text/books.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const BOOKS_ROOT = path.join(ROOT, "exports", "audio-text", "books");

const replacements = {
  "english-g1/pages/page-002.txt": "באנגלית יש 26 אותיות.\nנכיר אותן לאט, בקבוצות קטנות.\nנתחיל בשלוש האותיות הראשונות:\nA היא האות הראשונה.\nB היא האות השנייה.\nC היא האות השלישית.\nבכל עמוד נזהה את צורת האות ונשמע את השם שלה.\n",
  "english-g1/pages/page-003.txt": "נכיר שתי אותיות גדולות: B ו-M.\nB היא אות אחת.\nM היא אות אחרת.\nנזהה כל אות לפי הצורה שלה.\n",
  "english-g1/pages/page-004.txt": "איזו אות גדולה זו?\nK\nל-K יש קו ישר וקווים אלכסוניים שנפגשים באמצע.\nזו האות K.\nK\n",
  "english-g1/pages/page-006.txt": "איזו אות גדולה זו?\nS\nל-S יש צורה מתפתלת, כמו קו שמתעגל לשני צדדים.\nזו האות S.\nהאות הגדולה היא S ✓\n",
  "english-g1/pages/page-010.txt": "נכיר שתי אותיות קטנות: d ו-t.\nd היא הצורה הקטנה של D.\nt היא הצורה הקטנה של T.\nהיום מזהים את הצורה, ולא מתבלבלים בין האותיות.\n",
  "english-g1/pages/page-011.txt": "איזו אות קטנה זו?\np\nל-p יש קו שיורד מתחת לשורה, ועיגול קטן בצד ימין של הקו.\nכך נראית האות p.\np\n",
  "english-g1/pages/page-013.txt": "איזו אות קטנה זו?\nb\nל-b יש קו ישר בצד שמאל, ועיגול קטן בצד ימין.\nזו האות b.\nהאות הקטנה היא b ✓\n",
  "english-g1/pages/page-023.txt": "כשמדברים על אותיות, יש שני דברים שונים:\nשם האות — איך קוראים לאות.\nצליל במילה — הקול שהאות משמיעה בתוך מילה.\nנכיר שלוש אותיות ראשונות:\nA היא האות הראשונה.\nB היא האות השנייה.\nC היא האות השלישית.\nבמילה cat האות C משמיעה צליל ק.\nזה הצליל שלה במילה, והוא שונה משם האות.\n",
  "english-g1/pages/page-024.txt": "מתרגלים זיהוי לפי שמיעה.\nכששומעים את שם האות A — מחפשים את A.\nכששומעים את שם האות M — מחפשים את M.\nמקשיבים לשם האות ומצביעים על הצורה הנכונה.\n",
  "english-g1/pages/page-025.txt": "מה שם האות?\nF\nמזהים את הצורה F.\nזו האות F.\nF\n",
  "english-g1/pages/page-027.txt": "מה שם האות J?\nמזהים את הצורה J.\nזו האות J.\nנכון.\n",
  "english-g1/pages/page-030.txt": "היום נשמע צלילים שאותיות משמיעות במילים.\nבמילה bat שומעים בהתחלה צליל ב.\nבמילה mom שומעים בהתחלה צליל מ.\nבמילה sun שומעים בהתחלה צליל ס.\nבמילים cat, bed ו-sit יש צליל קצר באמצע.\n",
  "english-g1/pages/page-031.txt": "במילה mom שומעים בתחילת המילה צליל מ.\nבמילה top שומעים בתחילת המילה צליל ט.\nמקשיבים לצליל הראשון ומחברים אותו לאות.\n",
  "english-g1/pages/page-032.txt": "איזה צליל שומעים בתחילת המילה sun?\nאומרים sun לאט.\nשומעים בהתחלה צליל ס.\nס\n",
  "english-g1/pages/page-034.txt": "איזה צליל שומעים בתחילת המילה pen?\nאומרים pen לאט.\nהמילה pen מתחילה בצליל פ.\nפ ✓\n",
  "english-g1/pages/page-038.txt": "במילה mom שומעים בהתחלה צליל מ.\nהמילה mom מתחילה בצליל מ.\nבמילה pen שומעים בהתחלה צליל פ.\nהמילה pen מתחילה בצליל פ.\n",
  "english-g1/pages/page-039.txt": "מה הצליל הראשון ב-cat?\nאומרים לאט: cat.\nהמילה cat מתחילה בצליל ק.\nק\n",
  "english-g1/pages/page-041.txt": "מה הצליל הראשון ב-hat?\nאומרים לאט: hat.\nהמילה hat מתחילה בצליל ה.\nהצליל הראשון ב-hat הוא ה ✓\n",
  "english-g1/pages/page-057.txt": "היום נלמד מילים קצרות של שלוש אותיות.\nלמשל, במילה cat יש שלוש אותיות.\nכשמחברים את הצלילים שלהן, מקבלים את המילה cat.\n",
  "english-g1/pages/page-058.txt": "אלה מילים קצרות של שלוש אותיות:\ncat\nhat\nsit\nsun\npen\nbed\nבכל מילה מחברים את הצלילים לפי הסדר.\n",
  "english-g1/pages/page-059.txt": "במילה cat מחברים את הצלילים לפי הסדר, ואז אומרים cat.\nבמילה sit מחברים את הצלילים לפי הסדר, ואז אומרים sit.\n",
  "english-g1/pages/page-060.txt": "איזו מילה שומעים כשמחברים את הצלילים של pen?\nמחברים את הצלילים לפי הסדר.\npen.\npen\n",
  "english-g1/pages/page-061.txt": "איזו מילה מקבלים מהאותיות b, e, d?\nנסו לפתור בעצמכם.\nבעמוד הבא נבדוק יחד את הדרך ואת התשובה.\n",
  "english-g1/pages/page-062.txt": "איזו מילה מקבלים מהאותיות b, e, d?\nמחברים את הצלילים לפי הסדר.\nמקבלים את המילה:\nbed\nbed = מיטה ✓\n",
  "english-g1/pages/page-079.txt": "Point to the door. — הצביעו על הדלת.\nShow me your pen. — הראו לי את העט.\nListen. — הקשיבו.\nLook. — הסתכלו.\n",
  "english-g1/pages/page-124.txt": "ילד קופץ גבוה באוויר.\nמה המילה באנגלית?\nנסו לפתור בעצמכם.\nבעמוד הבא נבדוק יחד את הדרך ואת התשובה.\n",
  "english-g2/pages/page-002.txt": "נחזור על זוגות של אות גדולה ואות קטנה.\nA מתאימה ל-a, B מתאימה ל-b, C מתאימה ל-c, וכך ממשיכים עד Z ו-z.\nA היא האות הראשונה.\nZ היא האות האחרונה.\nM גדולה מתאימה ל-m קטנה.\nS גדולה מתאימה ל-s קטנה.\n",
  "english-g2/pages/page-003.txt": "נכיר שתי אותיות: G ו-R.\nG גדולה מתאימה ל-g קטנה.\nR גדולה מתאימה ל-r קטנה.\nנזהה את האות לפי הצורה שלה.\n",
  "english-g2/pages/page-006.txt": "השאלה: מה הזוג הקטן של Q?\nלכל אות גדולה יש זוג קטן.\nהזוג הקטן של Q הוא q.\nq ✓\n",
  "english-g2/pages/page-008.txt": "היום נלמד את סדר האותיות באנגלית.\nמתחילים ב-A, ממשיכים ל-B ול-C, ומתקדמים עד Z.\nזה כמו אלף־בית — אבל באנגלית.\n",
  "english-g2/pages/page-009.txt": "נחזור על סדר האותיות בקבוצות.\nהקבוצה הראשונה מתחילה ב-A וממשיכה עד G.\nהקבוצה השנייה מתחילה ב-H וממשיכה עד N.\nהקבוצה השלישית מתחילה ב-O וממשיכה עד T.\nהקבוצה הרביעית מתחילה ב-U וממשיכה עד Z.\nאחרי M באה N.\nאחרי S באה T.\n",
  "english-g2/pages/page-015.txt": "היום חוזרים על צלילים באנגלית.\nנקשיב לצלילים בתחילת מילים, ונבדיל בין מילים שנשמעות דומות.\nלמשל: bat ו-pen, dog ו-top.\n",
  "english-g2/pages/page-016.txt": "במילה bat שומעים בהתחלה צליל ב.\nבמילה pen שומעים בהתחלה צליל פ.\nבמילה dog שומעים בהתחלה צליל ד.\nבמילה top שומעים בהתחלה צליל ט.\nגם הצליל שבאמצע המילה חשוב, למשל ב-cat, bed ו-sit.\n",
  "english-g2/pages/page-017.txt": "אם שומעים בתחילת מילה צליל ב, זה לא אותו דבר כמו צליל פ.\nאם שומעים בתחילת מילה צליל ט, זה לא אותו דבר כמו צליל ד.\nמקשיבים לאט ומזהים את הצליל הראשון.\n",
  "english-g2/pages/page-018.txt": "איזה צליל שומעים בתחילת המילה pen?\nאומרים pen לאט.\nשומעים בהתחלה צליל פ.\nפ\n",
  "english-g2/pages/page-020.txt": "השאלה: איזה צליל שומעים בתחילת den?\nמקשיבים לצליל הראשון.\nden מתחילה בצליל ד, כמו dog.\nד ✓\n",
  "english-g2/pages/page-022.txt": "היום נלמד לחבר צלילים למילה.\nמקשיבים לצלילים לפי הסדר, ואז אומרים את כל המילה.\n",
  "english-g2/pages/page-023.txt": "במילה cat מחברים את הצלילים לפי הסדר, ואז אומרים cat.\nבמילה hat מחברים את הצלילים לפי הסדר, ואז אומרים hat.\nבמילה sit מחברים את הצלילים לפי הסדר, ואז אומרים sit.\nבמילה run מחברים את הצלילים לפי הסדר, ואז אומרים run.\nבמילה big מחברים את הצלילים לפי הסדר, ואז אומרים big.\nבמילה red מחברים את הצלילים לפי הסדר, ואז אומרים red.\nבמילה hot מחברים את הצלילים לפי הסדר, ואז אומרים hot.\nבמילה sun מחברים את הצלילים לפי הסדר, ואז אומרים sun.\n",
  "english-g2/pages/page-024.txt": "במילה cat מפרידים את הצלילים, ואז מחברים אותם שוב.\nאומרים לאט, ואז אומרים את המילה השלמה: cat.\n",
  "english-g2/pages/page-025.txt": "איזו מילה מקבלים כשמחברים את הצלילים של sun?\nמחברים לפי הסדר.\nsun.\nsun\n",
  "english-g2/pages/page-026.txt": "איזו מילה מקבלים כשמחברים את הצלילים של pig?\nנסו לפתור בעצמכם.\nבעמוד הבא נבדוק יחד את הדרך ואת התשובה.\n",
  "english-g2/pages/page-027.txt": "השאלה: איזו מילה מקבלים כשמחברים את הצלילים של pig?\nמחברים לפי הסדר.\nמקבלים pig.\npig ✓\n",
  "english-g2/pages/page-028.txt": "עכשיו יודעים לחבר צלילים.\nבעמוד הבא נחזק את הקשר בין צליל לאות.\n",
  "english-g2/pages/page-029.txt": "היום נחזק את הקשר בין צליל לאות.\nכששומעים צליל מ בתחילת מילה, מחפשים את האות המתאימה.\nכשמסתכלים על אות, חושבים איזה צליל היא יכולה להשמיע במילה.\n",
  "english-g2/pages/page-030.txt": "שומעים צליל מ בתחילת מילה — מחפשים את האות M.\nשומעים צליל ס בתחילת מילה — מחפשים את האות S.\nבמילה cat שומעים בהתחלה צליל ק — מחפשים את האות C.\nרואים B — חושבים על צליל ב בתחילת מילה.\nרואים T — חושבים על צליל ט בתחילת מילה.\n",
  "english-g2/pages/page-031.txt": "שומעים צליל מ בתחילת מילה — מחפשים M.\nרואים F — חושבים על צליל פ בתחילת מילה.\n",
  "english-g2/pages/page-032.txt": "איזו אות מתאימה לצליל הראשון במילה cat?\ncat מתחילה בצליל ק.\nבמילה cat הצליל הזה נכתב באות C.\nC\n",
  "english-g2/pages/page-034.txt": "השאלה: איזה צליל יכולה להשמיע H בתחילת מילה?\nחושבים על המילה hat.\nב-hat שומעים בהתחלה צליל ה.\nה ✓\n",
  "english-g2/pages/page-036.txt": "היום קוראים מילים קצרות ומילים שחוזרות הרבה באנגלית.\nיש מילים שמחברים לפי צלילים, ויש מילים שפשוט מכירים מרוב תרגול.\n",
  "english-g2/pages/page-037.txt": "מילים קצרות:\ncat, sit, run.\nמילים שרואים הרבה באנגלית:\nthe — מילה קטנה לפני שם, למשל: the cat\nI — אני\na — מילה קטנה לפני שם עצם, למשל: a cat\nis — מופיעה במשפטים כמו: it is red\n",
  "english-g2/pages/page-038.txt": "קוראים את המילה cat.\nקוראים את המילה I — אני.\nבשלב הזה מתרגלים כל מילה בנפרד.\n",
  "english-g2/pages/page-043.txt": "היום נלמד משפחות מילים — מילים עם סוף דומה.\nלמשל: cat, hat ו-bat מסתיימות באותו צליל.\nגם man, can ו-fan מסתיימות באותו צליל.\n",
  "english-g2/pages/page-044.txt": "משפחות מילים:\ncat, hat, bat — סוף דומה.\nman, can, fan — סוף דומה.\nsit, hit, bit — סוף דומה.\ndog, log, fog — סוף דומה.\nמשנים את ההתחלה, והסוף נשאר דומה.\n",
  "english-g2/pages/page-045.txt": "cat ו-hat נשמעות דומות בסוף.\nsit ו-hit נשמעות דומות בסוף.\ndog ו-log נשמעות דומות בסוף.\n",
  "english-g2/pages/page-046.txt": "איזו מילה נשמעת כמו cat בסוף, אבל היא לא cat?\nhat נשמעת דומה בסוף.\nגם bat מתאימה.\n",
  "english-g2/pages/page-047.txt": "איזו מילה נשמעת כמו man בסוף, אבל היא לא man?\nנסו לפתור בעצמכם.\nבעמוד הבא נבדוק יחד את הדרך ואת התשובה.\n",
  "english-g2/pages/page-048.txt": "השאלה: איזו מילה נשמעת כמו man בסוף, אבל היא לא man?\nאפשר לבחור can או fan.\nשתיהן נשמעות דומות ל-man בסוף.\ncan או fan ✓\n",
  "english-g2/pages/page-069.txt": "השאלה: שומעים \"friend\" — מה המילה?\nמכירים את המילה friend.\nfriend פירושה חבר או חברה.\nfriend ✓\n",
  "english-g2/pages/page-170.txt": "Thank you — תודה.\nThank you, teacher.\nתודה לך, המורה.\n",
  "english-g2/pages/page-171.txt": "המורה עזרה לך.\nמה אומרים?\nThank you\nתודה.\n"
};

const changed = [];
for (const [rel, content] of Object.entries(replacements)) {
  const file = path.join(BOOKS_ROOT, rel);
  if (!file.startsWith(BOOKS_ROOT)) throw new Error(`Unsafe path: ${rel}`);
  if (!fs.existsSync(file)) throw new Error(`Missing file: ${file}`);
  const before = fs.readFileSync(file, "utf8");
  const next = content.endsWith("\n") ? content : `${content}\n`;
  if (before !== next) {
    fs.writeFileSync(file, next, "utf8");
    changed.push(rel);
  }
}

console.log(JSON.stringify({ changedCount: changed.length, changed }, null, 2));
