"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Loader2, MessageCircle, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
  context?: string[];
}

export default function PatientChatPage() {
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hello ${user?.name?.split(" ")[0] || "there"}! I'm your AI medical assistant. I have access to your medical reports and prescriptions. How can I help you today?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await api.post("/api/chat/", { message: text });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.reply, context: res.data.context_used },
      ]);
    } catch {
      toast.error("Failed to get a response from the backend chat service");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error while contacting the backend chat service. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] lg:h-[calc(100vh-3rem)]">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-violet-500" />
          AI Health Assistant
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Powered by Gemini — aware of your medical history
        </p>
      </div>

      {/* Chat window */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                  msg.role === "user" ? "bg-sky-500" : "bg-violet-500"
                )}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Sparkles className="w-4 h-4 text-white" />
                )}
              </div>

              {/* Bubble */}
              <div className={cn("max-w-[80%] space-y-1", msg.role === "user" ? "items-end" : "items-start")}>
                <div
                  className={cn(
                    "px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "bg-sky-500 text-white rounded-tr-sm"
                      : "bg-slate-50 text-slate-800 rounded-tl-sm border border-slate-100"
                  )}
                >
                  {msg.content}
                </div>
                {msg.context && msg.context.length > 0 && (
                  <p className="text-xs text-slate-400 pl-1">
                    {msg.context.length} medical context chunk(s) used
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-violet-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your health, medications, report results…"
              rows={1}
              className="flex-1 resize-none px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 text-sm text-slate-800 placeholder-slate-400 max-h-32"
              style={{ minHeight: "44px" }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="p-3 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 text-white rounded-xl transition-colors shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Always consult a licensed physician for medical decisions
          </p>
        </div>
      </div>
    </div>
  );
}
