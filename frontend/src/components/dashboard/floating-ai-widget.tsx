"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { AnalysisRunner } from "./analysis-runner";
import { SharedMemoryDemo } from "./shared-memory-demo";

export function FloatingAIWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"
      >
        <Sparkles size={22} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/40"
            />
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="fixed bottom-24 right-6 z-50 max-h-[75vh] w-full max-w-md overflow-y-auto rounded-xl border border-line bg-surface p-5 shadow-2xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={18} className="text-indigo-500" />
                  <h2 className="font-semibold">Motor de Análisis Inteligente</h2>
                </div>
                <button onClick={() => setOpen(false)}><X size={18} /></button>
              </div>
              <div className="space-y-4">
                <AnalysisRunner />
                <SharedMemoryDemo />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}