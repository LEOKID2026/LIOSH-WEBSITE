/** Classic (dark) theme — shared public shell pages (/about, /contact, /help). */

export const SHARED_SHELL_CLASSIC = Object.freeze({
  showVideoBg: true,
  aboutVideoOverlay: "absolute inset-0 bg-black/50 z-10",
  contactVideoOverlay:
    "fixed inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 -z-10 pointer-events-none",
  aboutMain:
    "relative min-h-screen flex flex-col items-center text-white p-0 m-0 overflow-x-hidden pt-0 mt-0",
  pageWrap: "relative w-full max-w-4xl mx-auto flex flex-col items-center text-white px-4 sm:px-6 pt-4 pb-10",
  helpWrap: "max-w-5xl mx-auto px-4 py-10 space-y-10 text-white",
  h1: "text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent leading-tight",
  helpH1:
    "text-4xl md:text-5xl font-black leading-tight bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent",
  contactH1:
    "text-3xl sm:text-5xl md:text-6xl font-extrabold mb-4 text-center drop-shadow-lg bg-gradient-to-r from-amber-200 via-amber-300 to-rose-300 bg-clip-text text-transparent",
  h2: "text-2xl sm:text-3xl font-bold mb-4 bg-gradient-to-r from-amber-200 to-rose-300 bg-clip-text text-transparent",
  h2Teal: "text-2xl sm:text-3xl font-bold mb-4 text-center bg-gradient-to-r from-teal-200 to-amber-200 bg-clip-text text-transparent",
  h2AmberTeal:
    "text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-amber-200 to-teal-300 bg-clip-text text-transparent",
  h2TealAmber:
    "text-2xl sm:text-3xl font-bold mb-6 text-center bg-gradient-to-r from-teal-200 to-amber-200 bg-clip-text text-transparent",
  body: "text-base sm:text-lg md:text-xl mb-4 text-white/90 text-right",
  bodyLast: "text-base sm:text-lg md:text-xl text-white/85 text-right",
  bodyCenter: "text-base sm:text-lg md:text-xl text-white/90 max-w-3xl mx-auto mb-4 text-right",
  bodyCenterMuted: "text-base sm:text-lg md:text-xl text-white/85 max-w-3xl mx-auto text-right",
  intro: "text-base sm:text-lg text-white/80 max-w-2xl text-center mb-8 leading-relaxed",
  badge: "inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 text-xs tracking-wider text-amber-300 font-semibold",
  helpSubtitle: "text-base md:text-lg text-white/70 max-w-2xl mx-auto",
  card: "bg-black/50 border border-white/10 p-6 rounded-xl shadow-md text-right",
  cardTitle: "text-lg sm:text-xl font-bold text-amber-200 mb-2",
  cardText: "text-sm sm:text-base text-white/85",
  secondaryCta:
    "bg-white/10 border border-white/25 hover:bg-white/20 px-8 py-4 rounded-xl text-base sm:text-lg font-bold text-white hover:scale-105 transition w-full sm:w-auto min-w-[200px]",
  imageBorder: "rounded-2xl border-2 border-amber-400/60 shadow-lg",
  input:
    "mt-1 w-full rounded-xl bg-black/50 border border-white/20 px-3 py-2 text-sm sm:text-base text-white placeholder:text-white/40 focus:outline-none focus:border-amber-400/50",
  formSection: "w-full max-w-2xl mb-10 rounded-2xl border border-white/15 bg-black/50 backdrop-blur-sm p-4 sm:p-6",
  formLabel: "text-white/85",
  faqBtn:
    "px-4 py-3 bg-black/50 backdrop-blur-sm border border-white/15 rounded-xl text-amber-100 font-semibold text-sm sm:text-base text-right hover:bg-black/65 hover:border-amber-400/40 transition",
  faqModalOverlay: "fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4",
  faqModalPanel: "relative w-full max-w-md min-h-[260px] rounded-2xl border border-white/20 overflow-hidden shadow-2xl",
  faqModalInner: "relative bg-black/75 backdrop-blur-sm p-6 sm:p-8 min-h-[260px] flex flex-col text-right",
  faqModalText: "text-base sm:text-lg text-white/95 leading-relaxed flex-1",
  link: "text-amber-300 underline hover:text-amber-200",
  linkMuted: "text-sm text-white/70",
  navLabel: "text-sm font-semibold text-white/80",
  helpLayoutWrap: "max-w-6xl mx-auto px-4 py-8 sm:py-10 text-white",
  helpArticleH1:
    "text-3xl sm:text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-300 via-amber-200 to-rose-300 bg-clip-text text-transparent",
  breadcrumbNav: "text-sm text-white/60 mb-4",
  breadcrumbSep: "text-white/40",
  breadcrumbCurrent: "text-white/80",
  breadcrumbLink:
    "hover:text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-0.5",
  tocMobile: "lg:hidden mb-6 rounded-xl border border-white/10 bg-black/50 p-4",
  tocMobileSummary: "cursor-pointer font-semibold text-amber-200 min-h-[44px] flex items-center",
  tocDesktop: "hidden lg:block sticky top-20 self-start rounded-xl border border-white/10 bg-black/50 p-4 text-right",
  tocTitle: "text-sm font-bold text-amber-200 mb-3",
  tocLink:
    "block py-1 text-white/75 hover:text-amber-200 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-1",
  searchInput:
    "w-full md:max-w-md rounded-xl bg-black/40 border border-white/20 px-4 py-3 min-h-[44px] text-white placeholder-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
  searchResult:
    "block rounded-xl border border-white/10 bg-black/50 p-4 hover:bg-black/65 transition text-right min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70",
  searchResultTitle: "font-bold text-amber-100",
  searchResultSummary: "text-sm text-white/65 mt-1 line-clamp-2",
  searchEmpty: "text-white/60 text-sm text-right",
  articleProse: "space-y-4 text-white/85",
  articleH2: "text-2xl font-bold text-amber-200 mt-8 mb-3",
  articleH3: "text-xl font-bold text-amber-100 mt-6 mb-2",
  calloutInfo: "border-sky-500/30 bg-sky-950/30",
  calloutWarning: "border-amber-500/40 bg-amber-950/20",
  calloutTip: "border-emerald-500/30 bg-emerald-950/20",
  disclaimer: "rounded-lg border border-white/14 bg-white/[0.06] px-4 py-4 text-right",
  disclaimerTitle: "text-sm font-extrabold text-white/90 mb-3",
  disclaimerText: "space-y-2 text-sm leading-relaxed text-white/76",
  relatedAside: "mt-8 pt-6 border-t border-white/10",
  relatedTitle: "text-lg font-bold text-amber-200 mb-3",
  relatedLink:
    "inline-flex min-h-[44px] items-center text-amber-100 hover:text-amber-200 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 rounded px-1",
  screenshotMissing:
    "my-6 rounded-xl border border-dashed border-white/20 bg-black/40 p-6 text-center text-white/50 text-sm",
  screenshotError:
    "my-6 rounded-xl border border-amber-500/30 bg-black/50 p-4 text-amber-200/80 text-sm text-right",
  screenshotBorder: "w-full h-auto rounded-xl border border-white/10 shadow-lg",
  screenshotCaption: "mt-2 text-sm text-white/65",
  videoPreview:
    "group relative flex w-full max-w-xl mx-auto sm:mx-0 overflow-hidden rounded-xl border border-white/15 bg-black/60 text-right shadow-md transition hover:border-amber-400/40 hover:shadow-amber-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70",
  videoPreviewLabel: "text-sm sm:text-base font-semibold text-white drop-shadow-md",
  videoDuration: "text-xs text-white/50 text-right",
  videoTranscript: "rounded-lg border border-white/10 bg-black/50 p-3 text-right",
  videoTranscriptSummary: "cursor-pointer font-semibold text-amber-200 min-h-[44px] flex items-center",
  videoTranscriptText: "mt-2 text-sm text-white/80 leading-relaxed whitespace-pre-wrap",
  videoModalOverlay: "absolute inset-0 bg-black/70 backdrop-blur-[2px]",
  videoModalDialog:
    "relative z-[101] flex w-full max-w-3xl max-h-[min(90vh,720px)] flex-col rounded-xl border border-white/15 bg-[#0f1419] shadow-2xl overflow-hidden",
  videoModalHeader: "flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3 py-2 sm:px-4",
  videoModalTitle: "text-sm font-semibold text-amber-100 truncate",
  videoModalClose:
    "shrink-0 min-h-[44px] min-w-[44px] rounded-lg border border-white/20 bg-white/10 px-3 text-sm font-bold text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400",
  videoModalBody: "flex min-h-0 flex-1 items-center justify-center p-2 sm:p-3 bg-black",
  updatedAt: "mt-8 text-xs text-white/40 text-right",
});
