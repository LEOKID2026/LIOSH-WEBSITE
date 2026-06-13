import { useEffect } from "react";
import Head from "next/head";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { resolveBrowserThemeColor } from "../lib/student-ui/browser-theme-color.client.js";

const SYNCED_META_NAMES = ["theme-color", "msapplication-TileColor"];

function syncMetaTag(name, content) {
  if (typeof document === "undefined") return;
  let el = document.querySelector(`meta[name="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

export default function BrowserThemeColorSync() {
  const { theme } = useStudentTheme();
  const color = resolveBrowserThemeColor(theme);

  useEffect(() => {
    SYNCED_META_NAMES.forEach((name) => syncMetaTag(name, color));
  }, [color]);

  return (
    <Head>
      <meta key="theme-color-dynamic" name="theme-color" content={color} />
      <meta
        key="msapplication-TileColor-dynamic"
        name="msapplication-TileColor"
        content={color}
      />
    </Head>
  );
}
