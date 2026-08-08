"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { FileSpreadsheet, UploadCloud, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { loadDataset } from "@/lib/data/load-dataset";
import { ACCEPTED_MIME } from "@/lib/data/parse";
import type { Dataset } from "@/types/data";

const SUGGESTED = [
  "Quarterly sales by region",
  "Marketing campaign performance",
  "Employee headcount & payroll",
  "Product inventory levels",
];

export function UploadZone({ onParsed }: { onParsed: (dataset: Dataset) => void }) {
  const [status, setStatus] = useState<"idle" | "reading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string } | null>(null);

  const handleFiles = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setError(null);
      setStatus("reading");
      setFileMeta({ name: file.name });
      setProgress(15);
      const progressTimer = setInterval(() => {
        setProgress((p) => (p < 85 ? p + Math.random() * 20 : p));
      }, 180);
      try {
        const dataset = await loadDataset(file);
        setProgress(100);
        clearInterval(progressTimer);
        setTimeout(() => {
          onParsed(dataset);
        }, 250);
      } catch (err) {
        clearInterval(progressTimer);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Something went wrong while reading this file.");
      }
    },
    [onParsed]
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: handleFiles,
    accept: ACCEPTED_MIME,
    multiple: false,
    noClick: true,
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center gap-8 px-4 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="text-center"
      >
        <div className="mx-auto mb-4 inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/60 px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="size-3.5" />
          No code required
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Turn your spreadsheet into a{" "}
          <span className="bg-gradient-to-r from-primary to-fuchsia-500 bg-clip-text text-transparent">
            dashboard you can trust
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-balance text-muted-foreground">
          Drop in a CSV or Excel file. We&apos;ll show you exactly what was detected before building
          anything — every number stays traceable back to your original data.
        </p>
      </motion.div>

      <div
        {...getRootProps()}
        className={`glass card-shadow relative w-full cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive ? "border-primary bg-accent/40" : "border-border hover:border-primary/50"
        }`}
        onClick={open}
      >
        <input {...getInputProps()} />
        <AnimatePresence mode="wait">
          {status === "reading" ? (
            <motion.div
              key="reading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.4, ease: "linear" }}
                className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"
              >
                <FileSpreadsheet className="size-7" />
              </motion.div>
              <div className="w-full max-w-xs space-y-2">
                <p className="text-sm font-medium">Reading {fileMeta?.name}…</p>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground">Detecting columns, types & building your dashboard</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 py-6"
            >
              <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UploadCloud className="size-7" />
              </div>
              <div>
                <p className="font-medium">Drag & drop your spreadsheet here</p>
                <p className="mt-1 text-sm text-muted-foreground">.xlsx, .xls, or .csv — up to 100,000+ rows</p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  open();
                }}
              >
                Browse Files
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </motion.div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-2">
        {SUGGESTED.map((s) => (
          <span
            key={s}
            className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground"
          >
            {s}
          </span>
        ))}
      </div>
    </div>
  );
}
