/** Classic (dark) theme — /gallery */

export const GALLERY_CLASSIC = Object.freeze({
  showVideoBg: true,
  videoOverlay:
    "fixed inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 -z-10 pointer-events-none",
  pageWrap: "text-white",
  container: "relative w-full max-w-6xl mx-auto px-3 sm:px-4 pt-1 md:pt-2 pb-4 overflow-x-hidden",
  titleInline:
    "text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold text-center leading-none min-w-0 px-1 drop-shadow-lg bg-gradient-to-r from-amber-200 via-amber-300 to-rose-300 bg-clip-text text-transparent",
  subtitle: "text-sm sm:text-base text-white/75 max-w-2xl text-center mb-4 md:mb-6 px-2 mx-auto mt-1",
  loading: "text-white/60 text-lg sm:text-xl text-center",
  empty: "text-white/60 text-base sm:text-lg text-center max-w-md mx-auto px-4",
  gridItem:
    "cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-amber-400/30 border border-white/15 aspect-square p-0 w-full",
  modalOverlay: "fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4",
  modalClose:
    "absolute top-4 start-4 bg-rose-600/90 text-white px-3 py-1 rounded-lg hover:bg-rose-700 text-lg",
  modalNav:
    "absolute top-1/2 -translate-y-1/2 bg-black/70 border border-white/20 text-white px-3 py-2 text-2xl rounded-full hover:bg-black/90",
  modalNavStart: "start-4",
  modalNavEnd: "end-4",
});
