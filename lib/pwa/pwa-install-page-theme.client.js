/** @typedef {'student' | 'parent' | 'teacher'} PwaInstallPortal */

const PORTAL_ACCENT = {
  student: {
    bright: {
      badge: "text-amber-600",
      backLink: "text-sky-700 hover:text-sky-900",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-700 hover:shadow-lg",
    },
    classic: {
      badge: "text-amber-300",
      backLink: "text-amber-300/80 hover:text-amber-200",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500 px-5 text-sm font-bold text-blue-800 shadow-md transition-all hover:from-yellow-400 hover:via-yellow-500 hover:to-yellow-600",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-700 hover:via-blue-700 hover:to-indigo-800 hover:shadow-lg",
    },
  },
  parent: {
    bright: {
      badge: "text-teal-700",
      backLink: "text-sky-700 hover:text-sky-900",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-700 hover:shadow-lg",
    },
    classic: {
      badge: "text-teal-300",
      backLink: "text-teal-300/80 hover:text-teal-200",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-teal-600 hover:via-emerald-600 hover:to-cyan-700",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-700 hover:via-blue-700 hover:to-indigo-800 hover:shadow-lg",
    },
  },
  teacher: {
    bright: {
      badge: "text-indigo-700",
      backLink: "text-sky-700 hover:text-sky-900",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:via-violet-700 hover:to-orange-600 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:via-violet-700 hover:to-orange-600",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-600 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-600 hover:via-blue-600 hover:to-indigo-700 hover:shadow-lg",
    },
    classic: {
      badge: "text-indigo-300",
      backLink: "text-indigo-300/80 hover:text-indigo-200",
      installBtn:
        "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:via-violet-700 hover:to-orange-600 hover:shadow-lg",
      iosHelpDoneBtn:
        "inline-flex h-9 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 via-violet-600 to-orange-500 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-indigo-600 hover:via-violet-700 hover:to-orange-600",
      iosHelpTrigger:
        "inline-flex h-11 w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 px-5 text-sm font-bold text-white shadow-md transition-all hover:from-sky-700 hover:via-blue-700 hover:to-indigo-800 hover:shadow-lg",
    },
  },
};

/** @param {PwaInstallPortal} portal @param {boolean} isBright */
export function getPwaInstallPageTheme(portal, isBright) {
  const accent = PORTAL_ACCENT[portal][isBright ? "bright" : "classic"];

  if (isBright) {
    return {
      pageWrap:
        "mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center",
      badge: `text-sm font-semibold uppercase tracking-widest ${accent.badge}`,
      heading: "text-xl font-bold text-slate-900 md:text-2xl",
      body: "text-sm leading-relaxed text-slate-600",
      backLink: `text-sm font-semibold underline-offset-2 hover:underline ${accent.backLink}`,
      iosHelpTrigger: accent.iosHelpTrigger,
      iosHelpDoneBtn: accent.iosHelpDoneBtn,
      launcher: {
        installBtn: accent.installBtn,
        nativeMsg:
          "rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600",
        successMsg:
          "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800",
        infoMsg:
          "rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-900",
        warnMsg:
          "rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900",
      },
    };
  }

  return {
    pageWrap:
      "mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 py-10 text-center",
    badge: `text-sm font-semibold uppercase tracking-widest ${accent.badge}`,
    heading: "text-xl font-bold text-white md:text-2xl",
    body: "text-sm leading-relaxed text-white/75",
    backLink: `text-sm font-semibold underline-offset-2 hover:underline ${accent.backLink}`,
    iosHelpTrigger: accent.iosHelpTrigger,
    iosHelpDoneBtn: accent.iosHelpDoneBtn,
    launcher: {
      installBtn: accent.installBtn,
      nativeMsg:
        "rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/70",
      successMsg:
        "rounded-xl border border-emerald-400/30 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100",
      infoMsg:
        "rounded-xl border border-sky-400/30 bg-sky-950/40 px-4 py-3 text-sm leading-relaxed text-sky-100",
      warnMsg:
        "rounded-xl border border-amber-400/30 bg-amber-950/40 px-4 py-3 text-sm leading-relaxed text-amber-100",
    },
  };
}
