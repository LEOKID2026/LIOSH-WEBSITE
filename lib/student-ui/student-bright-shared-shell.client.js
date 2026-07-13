/** Bright theme — shared public shell pages (/about, /contact, /help). */

export const SHARED_SHELL_BRIGHT = Object.freeze({
  showVideoBg: false,
  aboutVideoOverlay: "",
  contactVideoOverlay: "",
  aboutMain:
    "relative min-h-screen flex flex-col items-center text-slate-800 p-0 m-0 overflow-x-hidden pt-0 mt-0",
  pageWrap:
    "relative w-full max-w-4xl mx-auto flex flex-col items-center text-slate-800 px-4 sm:px-6 pt-4 pb-10",
  helpWrap: "max-w-5xl mx-auto px-4 py-10 space-y-10 text-slate-800",
  h1: "text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 bg-clip-text text-transparent leading-tight",
  helpH1:
    "text-4xl md:text-5xl font-black leading-tight bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 bg-clip-text text-transparent",
  contactH1:
    "text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-center bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 bg-clip-text text-transparent",
  h2: "text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-sky-600 to-rose-500 bg-clip-text text-transparent",
  h2Teal: "text-2xl sm:text-3xl font-bold mb-4 text-center bg-gradient-to-r from-teal-600 to-sky-600 bg-clip-text text-transparent",
  h2AmberTeal:
    "text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-amber-600 to-teal-600 bg-clip-text text-transparent",
  h2TealAmber:
    "text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-teal-600 to-amber-600 bg-clip-text text-transparent",
  body: "text-base sm:text-lg md:text-xl mb-4 text-slate-700 text-right",
  bodyLast: "text-base sm:text-lg md:text-xl text-slate-600 text-right",
  bodyCenter: "text-base sm:text-lg md:text-xl text-slate-700 max-w-3xl mx-auto mb-4 text-right",
  bodyCenterMuted: "text-base sm:text-lg md:text-xl text-slate-600 max-w-3xl mx-auto text-right",
  intro: "text-base sm:text-lg text-slate-600 max-w-2xl text-center mb-8 leading-relaxed",
  badge:
    "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-xs tracking-wider text-sky-700 font-semibold",
  helpSubtitle: "text-base md:text-lg text-slate-600 max-w-2xl mx-auto",
  card: "bg-white border border-sky-200 p-6 rounded-xl shadow-md shadow-sky-100/80 text-right",
  cardTitle: "text-lg sm:text-xl font-bold text-amber-700 mb-2",
  cardText: "text-sm sm:text-base text-slate-600",
  secondaryCta:
    "bg-white border border-sky-300 hover:bg-sky-50 px-8 py-4 rounded-xl text-base sm:text-lg font-bold text-slate-800 hover:scale-105 transition w-full sm:w-auto min-w-[200px] shadow-sm",
  imageBorder: "rounded-2xl border-2 border-sky-300/80 shadow-lg shadow-sky-100/80",
  input:
    "mt-1 w-full rounded-xl bg-white border border-sky-200 px-3 py-2 text-sm sm:text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-sky-400",
  formSection:
    "w-full max-w-2xl mb-10 rounded-2xl border border-sky-200 bg-white/95 backdrop-blur-sm p-4 sm:p-6 shadow-sm",
  formLabel: "text-slate-700",
  faqBtn:
    "px-4 py-3 bg-white border border-sky-200 rounded-xl text-slate-800 font-semibold text-sm sm:text-base text-right hover:bg-sky-50 hover:border-sky-400 transition shadow-sm",
  faqModalOverlay: "fixed inset-0 bg-slate-900/45 backdrop-blur-sm flex items-center justify-center z-50 p-4",
  faqModalPanel:
    "relative w-full max-w-md min-h-[260px] rounded-2xl border border-sky-200 overflow-hidden shadow-xl bg-white",
  faqModalInner: "relative p-6 sm:p-8 min-h-[260px] flex flex-col text-right",
  faqModalText: "text-base sm:text-lg text-slate-700 leading-relaxed flex-1",
  link: "text-sky-700 underline hover:text-sky-900",
  linkMuted: "text-sm text-slate-600",
  navLabel: "text-sm font-semibold text-slate-700",
  helpLayoutWrap: "max-w-6xl mx-auto px-4 py-8 sm:py-10 text-slate-800",
  helpArticleH1:
    "text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-sky-600 via-violet-600 to-rose-500 bg-clip-text text-transparent",
  breadcrumbNav: "text-sm text-slate-500 mb-4",
  breadcrumbSep: "text-slate-400",
  breadcrumbCurrent: "text-slate-700",
  breadcrumbLink:
    "hover:text-sky-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 rounded px-0.5",
  tocMobile: "lg:hidden mb-6 rounded-xl border border-sky-200 bg-white p-4 shadow-sm",
  tocMobileSummary: "cursor-pointer font-semibold text-sky-800 min-h-[44px] flex items-center",
  tocDesktop:
    "hidden lg:block sticky top-20 self-start rounded-xl border border-sky-200 bg-white p-4 text-right shadow-sm",
  tocTitle: "text-sm font-bold text-sky-800 mb-3",
  tocLink:
    "block py-1 text-slate-600 hover:text-sky-700 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 rounded px-1",
  searchInput:
    "w-full md:max-w-md rounded-xl bg-white border border-sky-200 px-4 py-3 min-h-[44px] text-slate-800 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70",
  searchResult:
    "block rounded-xl border border-sky-200 bg-white p-4 hover:bg-sky-50 transition text-right min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 shadow-sm",
  searchResultTitle: "font-bold text-slate-800",
  searchResultSummary: "text-sm text-slate-600 mt-1 line-clamp-2",
  searchEmpty: "text-slate-500 text-sm text-right",
  articleProse: "space-y-4 text-slate-700",
  articleH2: "text-2xl font-bold text-sky-800 mt-8 mb-3",
  articleH3: "text-xl font-bold text-sky-700 mt-6 mb-2",
  calloutInfo: "border-sky-200 bg-sky-50",
  calloutWarning: "border-amber-200 bg-amber-50",
  calloutTip: "border-emerald-200 bg-emerald-50",
  disclaimer: "rounded-lg border border-sky-200 bg-sky-50/80 px-4 py-4 text-right",
  disclaimerTitle: "text-sm font-extrabold text-slate-800 mb-3",
  disclaimerText: "space-y-2 text-sm leading-relaxed text-slate-600",
  relatedAside: "mt-8 pt-6 border-t border-sky-200",
  relatedTitle: "text-lg font-bold text-sky-800 mb-3",
  relatedLink:
    "inline-flex min-h-[44px] items-center text-sky-700 hover:text-sky-900 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 rounded px-1",
  screenshotMissing:
    "my-6 rounded-xl border border-dashed border-sky-200 bg-sky-50 p-6 text-center text-slate-500 text-sm",
  screenshotError:
    "my-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-800 text-sm text-right",
  screenshotBorder: "w-full h-auto rounded-xl border border-sky-200 shadow-md",
  screenshotCaption: "mt-2 text-sm text-slate-600",
  videoPreview:
    "group relative flex w-full max-w-xl mx-auto sm:mx-0 overflow-hidden rounded-xl border border-sky-200 bg-white text-right shadow-md transition hover:border-sky-400 hover:shadow-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70",
  videoPreviewLabel: "text-sm sm:text-base font-semibold text-slate-800 drop-shadow-sm",
  videoDuration: "text-xs text-slate-500 text-right",
  videoTranscript: "rounded-lg border border-sky-200 bg-white p-3 text-right shadow-sm",
  videoTranscriptSummary: "cursor-pointer font-semibold text-sky-800 min-h-[44px] flex items-center",
  videoTranscriptText: "mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap",
  videoModalOverlay: "absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]",
  videoModalDialog:
    "relative z-[101] flex w-full max-w-3xl max-h-[min(90vh,720px)] flex-col rounded-xl border border-sky-200 bg-white shadow-2xl overflow-hidden",
  videoModalHeader: "flex shrink-0 items-center justify-between gap-2 border-b border-sky-200 px-3 py-2 sm:px-4",
  videoModalTitle: "text-sm font-semibold text-slate-800 truncate",
  videoModalClose:
    "shrink-0 min-h-[44px] min-w-[44px] rounded-lg border border-sky-200 bg-sky-50 px-3 text-sm font-bold text-slate-800 hover:bg-sky-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400",
  videoModalBody: "flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3 bg-slate-100",
  updatedAt: "mt-8 text-xs text-slate-500 text-right",
});
