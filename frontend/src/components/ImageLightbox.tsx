import { useRef } from "react";
import { appIcons } from "../icons";
import { ModalLayer } from "./ModalLayer";

type ImageLightboxProps = {
  alt: string;
  isOpen: boolean;
  src: string;
  onClose: () => void;
};

export const ImageLightbox = ({ alt, isOpen, src, onClose }: ImageLightboxProps) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const CloseIcon = appIcons.actions.remove;
  const isVisible = isOpen && Boolean(src);

  if (!isVisible) return null;

  return (
    <ModalLayer
      backdropClassName="image-lightbox-backdrop"
      initialFocusRef={closeButtonRef}
      onClose={onClose}
    >
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
          aria-label="Close Image Preview"
          className="image-lightbox-close"
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </section>
    </ModalLayer>
  );
};
