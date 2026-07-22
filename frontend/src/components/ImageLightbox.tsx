import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { appIcons } from "../icons";

type ImageLightboxProps = {
  alt: string;
  isOpen: boolean;
  src: string;
  onClose: () => void;
};

export const ImageLightbox = ({ alt, isOpen, src, onClose }: ImageLightboxProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const CloseIcon = appIcons.actions.remove;
  const isVisible = isOpen && Boolean(src);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isVisible) return;

    const root = document.documentElement;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousRootOverflow = root.style.overflow;
    const previousRootScrollbarGutter = root.style.scrollbarGutter;
    const previousBodyOverflow = document.body.style.overflow;
    const closeOnKeyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "stable";
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnKeyboard);
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      window.cancelAnimationFrame(focusFrame);
      root.style.overflow = previousRootOverflow;
      root.style.scrollbarGutter = previousRootScrollbarGutter;
      document.body.style.overflow = previousBodyOverflow;
      document.removeEventListener("keydown", closeOnKeyboard);
      previouslyFocused?.focus();
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return createPortal(
    <>
      <div
        aria-hidden="true"
        className="image-lightbox-backdrop"
        onPointerDown={onClose}
      />
      <section
        aria-label={alt}
        aria-modal="true"
        className="image-lightbox-layer"
        role="dialog"
      >
        <div className="image-lightbox-viewer">
          <img src={src} alt={alt} />
        </div>
        <button
          aria-label="Close image preview"
          className="image-lightbox-close"
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </section>
    </>,
    document.body,
  );
};
