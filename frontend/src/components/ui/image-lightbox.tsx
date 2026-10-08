"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

interface ImageLightboxProps {
  src: string;
  alt: string;
  thumbClassName?: string;
}

export function ImageLightbox({
  src,
  alt,
  thumbClassName = "",
}: ImageLightboxProps) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("enlargeImage")}
        className={`block cursor-zoom-in overflow-hidden focus-visible:outline-2 focus-visible:outline-accent ${thumbClassName}`}
      >
        {/* External Cloudinary image: crossOrigin is required by COEP (require-corp) */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          crossOrigin="anonymous"
          loading="lazy"
          className="h-full w-full object-cover transition-opacity hover:opacity-90"
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label={alt || t("enlargeImage")}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-6 top-6 text-white/80 hover:text-white"
              aria-label={t("closeImage")}
            >
              <X size={24} />
            </button>
            <motion.img
              crossOrigin="anonymous"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              src={src}
              alt={alt}
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}