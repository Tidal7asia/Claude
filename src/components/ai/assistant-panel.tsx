"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, X, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/lib/store/dashboard-store";
import { interpretPrompt, SUGGESTED_PROMPTS } from "@/lib/ai/assistant";
import type { RawRow } from "@/types/dashboard";
import type { DataSummary } from "@/types/data";
import { cn } from "@/lib/utils";
import { generateId } from "@/lib/utils/id";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export function AssistantPanel({ rows, summary, sheetId }: { rows: RawRow[]; summary: DataSummary; sheetId: string }) {
  const isOpen = useDashboardStore((s) => s.isAssistantOpen);
  const toggle = useDashboardStore((s) => s.toggleAssistant);
  const addChart = useDashboardStore((s) => s.addChart);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", text: "Ask me about your data — I can chart it for you. Try one of the prompts below." },
  ]);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function handleSend(prompt?: string) {
    const text = (prompt ?? input).trim();
    if (!text) return;
    setMessages((m) => [...m, { id: generateId("u"), role: "user", text }]);
    setInput("");

    const response = interpretPrompt(text, summary, sheetId, rows);
    setTimeout(() => {
      setMessages((m) => [...m, { id: generateId("a"), role: "assistant", text: response.message }]);
      if (response.chart) addChart(response.chart);
    }, 350);
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] lg:hidden"
            onClick={() => toggle(false)}
          />
          <motion.div
            initial={{ x: 360, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 360, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="glass card-shadow fixed bottom-4 right-4 top-auto z-50 flex h-[520px] w-[360px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl"
          >
            <div className="flex items-center justify-between border-b border-border/60 p-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-fuchsia-500 text-white">
                  <Sparkles className="size-3.5" />
                </div>
                <p className="text-sm font-semibold">AI Analytics Assistant</p>
              </div>
              <button onClick={() => toggle(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div key={m.id} className={cn("flex items-start gap-2", m.role === "user" && "flex-row-reverse")}>
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-full",
                      m.role === "assistant" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {m.role === "assistant" ? <Bot className="size-3.5" /> : <User className="size-3.5" />}
                  </span>
                  <div
                    className={cn(
                      "max-w-[240px] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                      m.role === "assistant" ? "bg-muted/70" : "bg-primary text-primary-foreground"
                    )}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {messages.length <= 1 && (
              <div className="flex flex-wrap gap-1.5 px-3 pb-2">
                {SUGGESTED_PROMPTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSend(p)}
                    className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent"
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border/60 p-3">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about your data…"
                className="h-9 text-xs"
              />
              <Button size="icon" className="size-9 shrink-0" onClick={() => handleSend()}>
                <Send className="size-4" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
