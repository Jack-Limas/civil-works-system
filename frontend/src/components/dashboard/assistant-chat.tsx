"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { useAskAssistant } from "@/lib/assistant-service";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = [
  "¿Qué obra tiene mayor riesgo de sobrecosto?",
  "¿Qué materiales están en stock bajo?",
  "Compara el avance de mis obras activas",
];

export function AssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const ask = useAskAssistant();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(question: string) {
    if (!question.trim()) return;
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setInput("");

    try {
      const answer = await ask.mutateAsync(question);
      setMessages((prev) => [...prev, { role: "assistant", text: answer }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "No pude procesar tu pregunta en este momento. Intenta de nuevo.",
        },
      ]);
    }
  }

  return (
    <div className="flex h-[420px] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto pr-1">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-ink-muted">
              Pregúntame sobre tus obras, materiales o alertas:
            </p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="block w-full rounded-lg border border-line bg-surface-2 px-3 py-2 text-left text-sm hover:bg-surface text-ink transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${
              m.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {m.role === "assistant" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-500">
                <Bot size={14} />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-accent text-white"
                  : "bg-surface-2 text-ink"
              }`}
            >
              {m.text}
            </div>
            {m.role === "user" && (
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-muted">
                <User size={14} />
              </div>
            )}
          </div>
        ))}

        {ask.isPending && (
          <p className="text-xs text-ink-muted animate-pulse">
            El asistente está pensando...
          </p>
        )}
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
          placeholder="Escribe tu pregunta..."
          className="flex-1 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm text-ink outline-none"
        />
        <button
          type="submit"
          disabled={ask.isPending}
          className="flex h-9 w-9 items-center justify-center rounded-md bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}