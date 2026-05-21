import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Layout from "../components/Layout";

export default function Gallery() {
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
    <Layout page="gallery">
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

      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/40 to-black/80 -z-10 pointer-events-none" aria-hidden />

      <div
        dir="rtl"
        className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 py-10 text-white"
      >
        <motion.h1
          className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-3 text-center drop-shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="bg-gradient-to-r from-amber-200 via-amber-300 to-rose-300 bg-clip-text text-transparent">
            גלריה
          </span>
        </motion.h1>

        <motion.p
          className="text-base sm:text-lg text-white/75 max-w-2xl text-center mb-8 px-2 mx-auto"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          רגעים מהאתר, מהמשחקים ומהחוויה הלימודית של הילדים.
        </motion.p>

        {loading ? (
          <p className="text-white/60 text-lg sm:text-xl text-center">טוען גלריה...</p>
        ) : items.length === 0 ? (
          <p className="text-white/60 text-base sm:text-lg text-center max-w-md mx-auto px-4">
            עדיין לא נוספו תמונות או סרטונים לגלריה.
          </p>
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
                className="cursor-pointer rounded-xl overflow-hidden shadow-lg hover:shadow-amber-400/30 border border-white/15 aspect-square p-0 w-full"
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

      {selectedIndex !== null && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
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
              className="absolute top-4 start-4 bg-rose-600/90 text-white px-3 py-1 rounded-lg hover:bg-rose-700 text-lg"
            >
              ✖
            </button>
            <button
              type="button"
              onClick={prevItem}
              aria-label="הקודם"
              className="absolute top-1/2 start-4 -translate-y-1/2 bg-black/70 border border-white/20 text-white px-3 py-2 text-2xl rounded-full hover:bg-black/90"
            >
              →
            </button>
            <button
              type="button"
              onClick={nextItem}
              aria-label="הבא"
              className="absolute top-1/2 end-4 -translate-y-1/2 bg-black/70 border border-white/20 text-white px-3 py-2 text-2xl rounded-full hover:bg-black/90"
            >
              ←
            </button>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}
