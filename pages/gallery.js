import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Layout from "../components/Layout";
import { useStudentTheme } from "../contexts/StudentThemeContext.jsx";
import { useGalleryUi } from "../hooks/useGalleryUi.js";
import StudentLoadingPanel from "../components/ui/StudentLoadingPanel.jsx";

export default function Gallery() {
  const { theme, tokens: T } = useStudentTheme();
  const { GL } = useGalleryUi();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((res) => res.json())
      .then((data) => {
        const images = (data.images || []).map((src) => ({ type: "image", src }));
        const videos = (data.videos || []).map((src) => ({ type: "video", src }));
        setItems([...images, ...videos]);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  const openModal = (i) => setSelectedIndex(i);
  const closeModal = () => setSelectedIndex(null);
  const prevItem = () => setSelectedIndex((prev) => (prev === 0 ? items.length - 1 : prev - 1));
  const nextItem = () => setSelectedIndex((prev) => (prev === items.length - 1 ? 0 : prev + 1));

  return (
    <Layout studentTheme={theme} studentShell="home">
      {GL.showVideoBg ? (
        <>
          <video
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            className="fixed inset-0 w-full h-full object-cover -z-10 pointer-events-none"
            aria-hidden
          >
            <source src="/videos/gallery-bg.mp4" type="video/mp4" />
          </video>
          <div className={GL.videoOverlay} aria-hidden />
        </>
      ) : null}

      <div dir="rtl" className={GL.pageWrap}>
        <div className={GL.container}>
          <div className={`${T.hubTopBar} mb-1 md:mb-2`}>
            <div className={T.hubTopBarBack}>
              <Link href="/student/home" className={T.hubBackLink}>
                חזרה
              </Link>
            </div>
            <motion.h1
              className={GL.titleInline}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              גלריה
            </motion.h1>
          </div>

          <motion.p
            className={GL.subtitle}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            רגעים מהאתר, מהמשחקים ומהחוויה הלימודית של הילדים.
          </motion.p>

          {loading ? (
            <StudentLoadingPanel message="טוען גלריה..." reportPage />
          ) : items.length === 0 ? (
            <p className={GL.empty}>עדיין לא נוספו תמונות או סרטונים לגלריה.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5 w-full pb-6">
              {items.map((item, index) => (
                <motion.button
                  key={index}
                  type="button"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.03, 0.5) }}
                  whileHover={{ scale: 1.04 }}
                  className={GL.gridItem}
                  onClick={() => openModal(index)}
                >
                  {item.type === "image" ? (
                    <img
                      src={item.src}
                      alt={`פריט גלריה ${index + 1}`}
                      className="w-full h-full object-cover block"
                    />
                  ) : (
                    <video src={item.src} className="w-full h-full object-cover block" muted playsInline />
                  )}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedIndex !== null && (
        <div
          className={GL.modalOverlay}
          dir="rtl"
          onClick={closeModal}
        >
          <motion.div
            className="relative max-w-5xl w-full max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
          >
            {items[selectedIndex].type === "image" ? (
              <img
                src={items[selectedIndex].src}
                alt={`פריט גלריה ${selectedIndex + 1}`}
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-xl mx-auto"
              />
            ) : (
              <video
                src={items[selectedIndex].src}
                autoPlay
                controls
                className="w-full max-h-[80vh] object-contain rounded-xl shadow-xl mx-auto"
              />
            )}

            <button
              type="button"
              onClick={closeModal}
              aria-label="סגור"
              className={GL.modalClose}
            >
              ✖
            </button>
            <button
              type="button"
              onClick={prevItem}
              aria-label="הקודם"
              className={`${GL.modalNav} ${GL.modalNavStart}`}
            >
              →
            </button>
            <button
              type="button"
              onClick={nextItem}
              aria-label="הבא"
              className={`${GL.modalNav} ${GL.modalNavEnd}`}
            >
              ←
            </button>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
