import { useState } from "react";
import PromoVideoModal from "./PromoVideoModal.jsx";

/**
 * Compact promo preview — click opens centered lightbox with full controls.
 * @param {{
 *   src: string,
 *   wrapClassName?: string,
 *   videoClassName?: string,
 *   ariaLabel: string,
 *   testId?: string,
 * }} props
 */
export default function PromoVideoClickablePreview({
  src,
  wrapClassName = "",
  videoClassName = "",
  ariaLabel,
  testId,
}) {
  const [open, setOpen] = useState(false);

  const openModal = () => setOpen(true);
  const closeModal = () => setOpen(false);

  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openModal();
    }
  };

  return (
    <>
      <div
        className={`group relative cursor-pointer ${wrapClassName}`}
        role="button"
        tabIndex={0}
        aria-label={`פתח ${ariaLabel}`}
        data-testid={testId ? `${testId}-preview` : "promo-video-preview"}
        onClick={openModal}
        onKeyDown={onKeyDown}
      >
        <video
          className={`pointer-events-none ${videoClassName}`}
          playsInline
          muted
          preload="metadata"
          disableRemotePlayback
          aria-hidden="true"
          tabIndex={-1}
          data-testid={testId}
        >
          <source src={src} type="video/mp4" />
        </video>
        <span
          className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/15 transition group-hover:bg-black/25 group-focus-visible:bg-black/25"
          aria-hidden="true"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-md md:h-12 md:w-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 translate-x-px md:h-6 md:w-6"
              aria-hidden="true"
            >
              <path d="M8 5.14v14.72a1 1 0 0 0 1.5.86l11.04-7.36a1 1 0 0 0 0-1.72L9.5 4.28A1 1 0 0 0 8 5.14Z" />
            </svg>
          </span>
        </span>
      </div>
      <PromoVideoModal open={open} onClose={closeModal} src={src} title={ariaLabel} />
    </>
  );
}
