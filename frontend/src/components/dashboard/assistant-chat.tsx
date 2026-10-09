"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send, Bot, User } from "lucide-react";
import { useAskAssistant } from "@/lib/assistant-service";
import { getHttpStatus } from "@/lib/api-error";
import { apiErrorCode, quotaHours } from "@/lib/api-client";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  text: string;
  failed?: boolean;
}

const SUGGESTION_KEYS = ["costRisk", "lowStock", "progress"] as const;

export function AssistantChat() {
  const t = useTranslations("assistant");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const ask = useAskAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, ask.isPending]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (trimmed.length < 3 || ask.isPending) return;
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", text: trimmed }]);
    setInput("");

    try {
      const answer = await ask.mutateAsync(trimmed);
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", text: answer }]);
    } catch (error) {
      // 503 AI_QUOTA_EXCEEDED = free daily quota spent; 502 = Gemini down. The system keeps working without it
      const text =
        apiErrorCode(error) === "AI_QUOTA_EXCEEDED"
          ? t("quotaExceeded", { hours: quotaHours(error) })
          : getHttpStatus(error) === 502
            ? t("unavailable")
            : t("errorMessage");
      setMessages((prev) => [...prev, { id: nextId.current++, role: "assistant", text, failed: true }]);
    }
  }

  return (
    <div className="flex h-[min(420px,60vh)] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1" aria-live="polite">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">{t("emptyStateHint")}</p>
            {SUGGESTION_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => send(t(`suggestions.${key}`))}
                className="block w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-sm text-ink transition-colors hover:bg-surface"
              >
                {t(`suggestions.${key}`)}
              </button>
            ))}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ai/15 text-ai" aria-hidden>
                <Bot size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : m.failed
                    ? "border border-critical/30 bg-critical/10 text-ink"
                    : "bg-surface-2 text-ink"
              }`}
            >
              <span className="sr-only">{m.role === "user" ? t("you") : t("title")}: </span>
              {m.text}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted" aria-hidden>
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {ask.isPending && <p className="animate-pulse text-xs text-ink-muted motion-reduce:animate-none">{t("thinking")}</p>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="mt-3 flex items-center gap-2 border-t border-line pt-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          maxLength={500}
          className="flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none focus:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
        />
        <button
          type="submit"
          disabled={ask.isPending || input.trim().length < 3}
          aria-label={t("send")}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-ai text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}
