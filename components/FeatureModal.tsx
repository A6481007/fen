"use client";

import { X, Check, LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

interface FeatureDetail {
  icon: LucideIcon;
  title: string;
  description: string;
  details: string[];
  benefits: string[];
}

interface FeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: FeatureDetail | null;
}

const FeatureModal = ({ isOpen, onClose, feature }: FeatureModalProps) => {
  const { t } = useTranslation();
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!feature) return null;

  const IconComponent = feature.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-2xl max-h-[90vh] overflow-hidden pointer-events-auto rounded-2xl border border-border bg-surface-0 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative border-b border-border p-6 lg:p-8">
                <button
                  onClick={onClose}
                  className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink hover:bg-surface-1"
                  aria-label={t("client.home.features.modal.close")}
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface-1">
                    <IconComponent className="h-7 w-7 text-ink" />
                  </div>
                  <div>
                    <h2 className="mb-1 text-2xl lg:text-3xl font-semibold text-ink-strong">
                      {feature.title}
                    </h2>
                    <p className="text-sm text-ink-muted lg:text-base">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
                {/* Details Section */}
                <div className="mb-8">
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-ink-strong">
                    <div className="h-6 w-1 rounded-full bg-ink" />
                    {t("client.home.features.modal.howItWorks")}
                  </h3>
                  <div className="space-y-3">
                    {feature.details.map((detail, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 rounded-xl border border-border bg-surface-0 p-4"
                      >
                        <div
                          className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-border bg-surface-1 text-[11px] font-semibold text-ink-strong"
                        >
                          {index + 1}
                        </div>
                        <p className="text-sm leading-relaxed text-ink">
                          {detail}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Benefits Section */}
                <div>
                  <h3 className="mb-3 flex items-center gap-2 text-xl font-semibold text-ink-strong">
                    <div className="h-6 w-1 rounded-full bg-ink" />
                    {t("client.home.features.modal.benefits")}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {feature.benefits.map((benefit, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.05 }}
                        className="flex items-start gap-3 rounded-xl border border-border bg-surface-0 p-3"
                      >
                        <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-ink" />
                        <p className="text-sm leading-relaxed text-ink">
                          {benefit}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border p-3">
                <button
                  onClick={onClose}
                  className="inline-flex items-center justify-center rounded-full border border-border px-5 py-2 text-sm font-semibold text-ink hover:border-ink"
                >
                  {t("client.home.features.modal.closeButton")}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FeatureModal;
