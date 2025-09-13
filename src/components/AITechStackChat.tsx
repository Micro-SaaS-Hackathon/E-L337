"use client";

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { TechStack } from "@/types/techStack";
import { LucideFullscreen, Send } from "lucide-react";
import { Button } from "./ui/Button";
import { ToggleSwitch } from "./ui/ToggleSwitch";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: Array<{
    category: string;
    field: string;
    value: string;
    name?: string;
    rationale?: string;
  }>;
}

interface AITechStackChatProps {
  onStackChange: (stack: Partial<TechStack>) => void;
  initialStack?: Partial<TechStack>;
}

export default function AITechStackChat({
  onStackChange,
  initialStack = {},
}: AITechStackChatProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Initialize messages from localStorage or use default
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== "undefined") {
      const savedMessages = localStorage.getItem("ai-chat-messages");
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          // Convert timestamp strings back to Date objects
          return parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
          }));
        } catch (e) {
          console.error("Failed to parse saved messages:", e);
        }
      }
    }
    return [
      {
        role: "assistant",
        content:
          "Hi! I'm your tech stack consultant. I'll help you choose the perfect technologies for your project based on your specific needs. Let's start with some questions:\n\n• What type of application are you building?\n• What's your team size and experience level?\n• Any performance or scalability requirements?\n\nOr click one of the quick start options below!",
        timestamp: new Date(),
      },
    ];
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [forceSuggestions, setForceSuggestions] = useState(false);

  // Track if user has sent a custom message (not from quick start)
  const [showQuickStart, setShowQuickStart] = useState(() => {
    if (typeof window !== "undefined") {
      const savedShowQuickStart = localStorage.getItem(
        "ai-chat-show-quick-start"
      );
      if (savedShowQuickStart !== null) {
        return JSON.parse(savedShowQuickStart);
      }
    }
    return true; // Show by default
  });

  // Initialize currentStack from localStorage or use initialStack
  const [currentStack, setCurrentStack] = useState<Partial<TechStack>>(() => {
    if (typeof window !== "undefined") {
      const savedStack = localStorage.getItem("ai-chat-stack");
      if (savedStack) {
        try {
          return JSON.parse(savedStack);
        } catch (e) {
          console.error("Failed to parse saved stack:", e);
        }
      }
    }
    return initialStack;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai-chat-messages", JSON.stringify(messages));
    }
  }, [messages]);

  // Save currentStack to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("ai-chat-stack", JSON.stringify(currentStack));
    }
  }, [currentStack]);

  // Save showQuickStart to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        "ai-chat-show-quick-start",
        JSON.stringify(showQuickStart)
      );
    }
  }, [showQuickStart]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    };

    if (fullscreen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [fullscreen]);

  useEffect(() => {
    onStackChange(currentStack);
  }, [currentStack, onStackChange]);

  // Helpers to normalize AI outputs
  const normalizeCategory = (c?: string) => {
    const s = (c || "").toLowerCase();
    if (["frontend", "front-end", "front_end", "front"].includes(s))
      return "frontend";
    if (["backend", "back-end", "back_end", "back"].includes(s))
      return "backend";
    if (["cloud", "clouds", "platform"].includes(s)) return "cloud";
    if (["optional", "optionals", "extras"].includes(s)) return "optional";
    return s || "frontend";
  };

  const normalizeField = (f?: string) => {
    const s = (f || "").toLowerCase();
    if (["framework", "frameworks"].includes(s)) return "framework";
    if (["language", "languages", "runtime"].includes(s)) return "language";
    if (["database", "databases", "db", "datastore"].includes(s))
      return "database";
    if (["styling", "styles", "style", "css", "ui", "ui-library"].includes(s))
      return "styling";
    if (
      ["provider", "providers", "cloudprovider", "cloud-provider"].includes(s)
    )
      return "provider";
    if (["hosting", "host"].includes(s)) return "hosting";
    if (["payment", "payments"].includes(s)) return "payment";
    if (["messagequeue", "mq", "queue"].includes(s)) return "messageQueue";
    if (["analytics", "product-analytics"].includes(s)) return "analytics";
    if (["testing", "tests"].includes(s)) return "testing";
    return s;
  };

  const canonicalizeValue = (
    category: string,
    field: string,
    value: string
  ) => {
    // Simply return the value as-is, allowing any tech stack
    return value;
  };

  const clearChat = () => {
    const initialMessage = {
      role: "assistant" as const,
      content:
        "Hi! I'm your tech stack consultant. I'll help you choose the perfect technologies for your project based on your specific needs. Let's start with some questions:\n\n• What type of application are you building?\n• What's your team size and experience level?\n• Any performance or scalability requirements?\n\nOr click one of the quick start options below!",
      timestamp: new Date(),
    };
    setMessages([initialMessage]);
    setCurrentStack({});
    setShowQuickStart(true); // Reset quick start visibility
    if (typeof window !== "undefined") {
      localStorage.removeItem("ai-chat-messages");
      localStorage.removeItem("ai-chat-stack");
      localStorage.removeItem("ai-chat-show-quick-start");
    }
  };

  const sendMessage = async (messageText?: string) => {
    const actualMessage = messageText || inputMessage;
    if (!actualMessage.trim() || isLoading) return;

    // Hide quick start if user typed their own message (not from quick start buttons)
    if (!messageText && showQuickStart) {
      setShowQuickStart(false);
    }

    const userMessage: Message = {
      role: "user",
      content: actualMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    if (!messageText) setInputMessage("");

    // Placeholder assistant message we will stream into
    const assistantIndex = messages.length + 1; // after adding user
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", timestamp: new Date() },
    ]);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const bodyPayload = {
        message: actualMessage,
        conversation: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        currentStack,
        forceSuggestions,
      };

      const res = await fetch("/api/ai-stack-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) throw new Error("Streaming connection failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";
      let fullFinalText = "";
      let suggestionsCaptured: any[] = [];

      const commitChunk = (text: string) => {
        setMessages((prev) =>
          prev.map((m, i) =>
            i === assistantIndex ? { ...m, content: m.content + text } : m
          )
        );
      };

      const parseEvent = (raw: string) => {
        const lines = raw.split("\n");
        let event: string | null = null;
        let dataLines: string[] = [];
        for (const l of lines) {
          if (l.startsWith("event:")) event = l.replace("event:", "").trim();
          else if (l.startsWith("data:")) dataLines.push(l.slice(5).trim());
        }
        if (!event) return null;
        const dataStr = dataLines.join("\n");
        return { event, dataStr };
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          if (!part.trim()) continue;
          const evt = parseEvent(part);
          if (!evt) continue;
          try {
            if (evt.event === "chunk") {
              const { text } = JSON.parse(evt.dataStr);
              fullFinalText += text;
              commitChunk(text);
            } else if (evt.event === "suggestions") {
              const { suggestions } = JSON.parse(evt.dataStr);
              suggestionsCaptured = suggestions || [];
            } else if (evt.event === "done") {
              const { final } = JSON.parse(evt.dataStr);
              // Replace content with cleaned final (without suggestions array)
              setMessages((prev) =>
                prev.map((m, i) =>
                  i === assistantIndex
                    ? { ...m, content: final, suggestions: suggestionsCaptured }
                    : m
                )
              );
            } else if (evt.event === "error") {
              console.error("Stream error event", evt.dataStr);
            }
          } catch (e) {
            console.error("Failed to parse SSE segment", e, part);
          }
        }
      }
    } catch (err) {
      console.error("Streaming failed:", err);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === assistantIndex
            ? {
                ...m,
                content:
                  "I'm sorry, I encountered an error while streaming. Please try again.",
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const removeStackItem = (category: string, field: string, value?: string) => {
    setCurrentStack((prev) => {
      const newStack = { ...prev };
      if (field === "styling" && value) {
        // Remove from array
        const currentArray = (newStack as any)[category]?.[field] || [];
        (newStack as any)[category][field] = currentArray.filter(
          (item: string) => item !== value
        );
      } else {
        // Clear single value
        if (newStack[category as keyof TechStack]) {
          (newStack as any)[category][field] = "";
        }
      }
      return newStack;
    });
  };

  const acceptSuggestion = (s: {
    category: string;
    field: string;
    value: string;
    name?: string;
  }) => {
    const cat = normalizeCategory(s.category);
    const fld = normalizeField(s.field);
    // Use the AI-provided name if available, otherwise use the value
    const displayValue = s.name || s.value;
    setCurrentStack((prev) => {
      const next: any = { ...prev };
      if (!next[cat]) next[cat] = {};
      if (cat === "frontend" && fld === "styling") {
        const arr = Array.isArray(next[cat][fld]) ? next[cat][fld] : [];
        if (!arr.includes(displayValue))
          next[cat][fld] = [...arr, displayValue];
        else next[cat][fld] = arr;
      } else {
        next[cat][fld] = displayValue;
      }
      return next;
    });
  };

  // After accepting a suggestion, remove it from that assistant message's list
  const handleAcceptSuggestion = (
    messageIndex: number,
    suggestionIndex: number,
    s: { category: string; field: string; value: string; name?: string }
  ) => {
    acceptSuggestion(s);
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== messageIndex) return m;
        const newSuggestions = (m.suggestions || []).filter(
          (_, j) => j !== suggestionIndex
        );
        return { ...m, suggestions: newSuggestions };
      })
    );
  };

  // Skip simply removes the suggestion from the UI (could be extended later to track skipped)
  const handleSkipSuggestion = (
    messageIndex: number,
    suggestionIndex: number
  ) => {
    setMessages((prev) =>
      prev.map((m, i) => {
        if (i !== messageIndex) return m;
        const newSuggestions = (m.suggestions || []).filter(
          (_, j) => j !== suggestionIndex
        );
        return { ...m, suggestions: newSuggestions };
      })
    );
  };

  const renderStackDisplay = () => {
    const stackItems = [];

    // Frontend
    if (currentStack.frontend?.framework) {
      const name = currentStack.frontend.framework;
      // Vibrant color mapping for frameworks
      const frameworkColors: Record<string, string> = {
        react: "bg-[#61dafb] text-[#20232a] border-[#61dafb]",
        nextjs: "bg-black text-white border-black",
        vue: "bg-[#42b883] text-white border-[#42b883]",
        angular: "bg-[#dd0031] text-white border-[#dd0031]",
        svelte: "bg-[#ff3e00] text-white border-[#ff3e00]",
        gatsby: "bg-[#663399] text-white border-[#663399]",
      };
      const fw = currentStack.frontend.framework.toLowerCase();
      const colorClass =
        frameworkColors[fw] ||
        "bg-primary/80 text-primary-foreground border-primary";
      stackItems.push(
        <span
          key="frontend-framework"
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] ${colorClass} transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group`}
        >
          {name}
          <button
            onClick={() => removeStackItem("frontend", "framework")}
            className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
            aria-label="Remove"
            type="button"
            style={{ lineHeight: 1, fontSize: "12px" }}
          >
            ×
          </button>
        </span>
      );
    }

    // Frontend Styling
    if (
      currentStack.frontend?.styling &&
      Array.isArray(currentStack.frontend.styling)
    ) {
      const stylingColors: Record<string, string> = {
        tailwind: "bg-[#cf649a] text-white border-[#cf649a]",
        shadcn: "bg-[#f4f4f5] text-[#18181b] border-[#f4f4f5]",
        mui: "bg-[#007fff] text-white border-[#007fff]",
        "styled-components": "bg-[#db7093] text-white border-[#db7093]",
        sass: "bg-[#cf649a] text-white border-[#cf649a]",
        chakra: "bg-[#319795] text-white border-[#319795]",
        emotion: "bg-[#ff4785] text-white border-[#ff4785]",
      };
      currentStack.frontend.styling.forEach((style) => {
        const name = style;
        const colorClass =
          stylingColors[style.toLowerCase()] ||
          "bg-primary/80 text-primary-foreground border-primary";
        stackItems.push(
          <span
            key={`frontend-styling-${style}`}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] ${colorClass} transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group`}
          >
            {name}
            <button
              onClick={() => removeStackItem("frontend", "styling", style)}
              className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
              aria-label="Remove"
              type="button"
              style={{ lineHeight: 1, fontSize: "12px" }}
            >
              ×
            </button>
          </span>
        );
      });
    }

    // Backend Language
    if (currentStack.backend?.language) {
      const name = currentStack.backend.language;
      stackItems.push(
        <span
          key="backend-language"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] bg-primary/10 text-primary border-primary transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group"
        >
          {name}
          <button
            onClick={() => removeStackItem("backend", "language")}
            className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
            aria-label="Remove"
            type="button"
            style={{ lineHeight: 1, fontSize: "12px" }}
          >
            ×
          </button>
        </span>
      );
    }

    // Backend Framework
    if (currentStack.backend?.framework) {
      const name = currentStack.backend.framework;
      stackItems.push(
        <span
          key="backend-framework"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] bg-primary/10 text-primary border-primary transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group"
        >
          {name}
          <button
            onClick={() => removeStackItem("backend", "framework")}
            className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
            aria-label="Remove"
            type="button"
            style={{ lineHeight: 1, fontSize: "12px" }}
          >
            ×
          </button>
        </span>
      );
    }

    // Backend Database
    if (currentStack.backend?.database) {
      const name = currentStack.backend.database;
      stackItems.push(
        <span
          key="backend-database"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] bg-primary/10 text-primary border-primary transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group"
        >
          {name}
          <button
            onClick={() => removeStackItem("backend", "database")}
            className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
            aria-label="Remove"
            type="button"
            style={{ lineHeight: 1, fontSize: "12px" }}
          >
            ×
          </button>
        </span>
      );
    }

    // Cloud Provider
    if (currentStack.cloud?.provider) {
      const name = currentStack.cloud.provider;
      stackItems.push(
        <span
          key="cloud-provider"
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold border shadow text-[10px] bg-primary/10 text-primary border-primary transition-all hover:scale-[1.04] hover:shadow-md hover:border-primary/60 cursor-pointer group"
        >
          {name}
          <button
            onClick={() => removeStackItem("cloud", "provider")}
            className="ml-0.5 px-1 py-0 rounded bg-transparent text-xs text-muted-foreground hover:text-destructive border-none outline-none"
            aria-label="Remove"
            type="button"
            style={{ lineHeight: 1, fontSize: "12px" }}
          >
            ×
          </button>
        </span>
      );
    }

    return stackItems;
  };

  return (
    <>
      {/* Fullscreen backdrop */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/50 z-[9998]"
          onClick={() => setFullscreen(false)}
        />
      )}

      <div
        className={`group flex flex-col bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70 border border-border/70 shadow-sm ring-1 ring-border/40 transition-all duration-300 overflow-hidden ${
          fullscreen
            ? "fixed inset-4 z-[9999] rounded-xl"
            : "relative w-full h-[720px] rounded-xl"
        }`}
      >
        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b bg-gradient-to-r from-background/80 to-muted/30 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <span className="text-lg font-semibold text-primary">AI</span>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-foreground/90 flex items-center gap-2">
                Tech Stack Assistant
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium border border-primary/20">
                  beta
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-snug">
                Get tailored framework, backend, database & cloud
                recommendations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={clearChat}
              size="sm"
              variant="ghost"
              className="gap-1 text-muted-foreground hover:text-foreground"
              title="Clear Chat"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              <span className="hidden md:inline text-xs font-medium">
                Clear
              </span>
            </Button>
            <Button
              onClick={() => setFullscreen((f) => !f)}
              size="sm"
              variant="outline"
              className="gap-1"
              title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              <LucideFullscreen className="h-4 w-4" />
              <span className="hidden md:inline text-xs font-medium">
                {fullscreen ? "Exit" : "Full"}
              </span>
            </Button>
          </div>
        </div>

        {/* Current Stack Chips */}
        <div className="px-4 pt-4 pb-2 border-b bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wide font-semibold text-muted-foreground/70 mb-2">
                Current Stack
              </div>
              <div className="flex flex-wrap gap-1.5 min-h-[1.75rem]">
                {renderStackDisplay().length > 0 ? (
                  renderStackDisplay()
                ) : (
                  <span className="text-xs text-muted-foreground italic">
                    Nothing selected yet
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Messages Scroll Area */}
        <div className="relative flex-1 overflow-hidden">
          <div
            ref={messagesContainerRef}
            className="absolute inset-0 overflow-y-auto px-4 py-5 space-y-5 custom-scrollbar scroll-smooth"
            style={{ scrollbarGutter: "stable" }}
          >
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex w-full ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-1 duration-300`}
              >
                <div
                  className={`group/message relative max-w-[78%] md:max-w-[70%] rounded-xl px-4 py-3 shadow-sm ring-1 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground ring-primary/50"
                      : "bg-muted/70 text-foreground ring-border/60"
                  }`}
                >
                  {/* Decorative gradient edge for assistant */}
                  {message.role === "assistant" && (
                    <span className="pointer-events-none absolute -left-1 top-4 h-6 w-1 rounded-full bg-gradient-to-b from-primary/60 via-primary to-primary/60 opacity-40 group-hover/message:opacity-70 transition" />
                  )}
                  <p className="font-medium mb-1 text-[11px] tracking-wide uppercase opacity-70 flex items-center gap-1">
                    {message.role === "user" ? "You" : "Assistant"}
                    <span className="w-1 h-1 rounded-full bg-current" />
                    <span>
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </p>
                  <div className="text-[13px] leading-[1.5] font-normal selection:bg-primary/20 prose dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5 prose-pre:text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>

                  {message.role === "assistant" &&
                    message.suggestions &&
                    message.suggestions.length > 0 && (
                      <div className="mt-4 border-t border-border/60 pt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                          <span className="text-[11px] font-semibold tracking-wide uppercase text-primary">
                            Recommendations
                          </span>
                        </div>
                        <div className="grid gap-2">
                          {message.suggestions.map((s, i) => {
                            const categoryColors: Record<string, string> = {
                              frontend:
                                "from-blue-500/15 to-blue-500/5 border-blue-400/40 text-blue-800 dark:text-blue-100",
                              backend:
                                "from-green-500/15 to-green-500/5 border-green-400/40 text-green-800 dark:text-green-100",
                              cloud:
                                "from-orange-500/15 to-orange-500/5 border-orange-400/40 text-orange-800 dark:text-orange-100",
                              optional:
                                "from-purple-500/15 to-purple-500/5 border-purple-400/40 text-purple-800 dark:text-purple-100",
                            };
                            const colorClass =
                              categoryColors[s.category] ||
                              "from-muted to-muted";
                            return (
                              <div
                                key={i}
                                className={`relative group/reco rounded-lg border bg-gradient-to-br ${colorClass} p-3 shadow-sm hover:shadow-md transition-all`}
                              >
                                <div className="flex flex-col gap-2">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="h-6 w-6 rounded-md bg-background/80 border border-border/50 flex items-center justify-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 shadow-sm">
                                        {s.category.slice(0, 2)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold leading-tight text-foreground/90 truncate">
                                          {s.name || s.value}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground/70 leading-snug">
                                          {s.category}/{s.field}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-7 px-2 text-[11px] font-medium"
                                        onClick={() =>
                                          handleAcceptSuggestion(index, i, s)
                                        }
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 px-2 text-[11px]"
                                        onClick={() =>
                                          handleSkipSuggestion(index, i)
                                        }
                                      >
                                        Skip
                                      </Button>
                                    </div>
                                  </div>
                                  {s.rationale && (
                                    <p className="text-[11px] leading-relaxed text-muted-foreground/90">
                                      {s.rationale}
                                    </p>
                                  )}
                                </div>
                                <div className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-inset ring-border/30 group-hover/reco:ring-primary/40 transition" />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="relative max-w-[60%] rounded-xl px-4 py-3 bg-muted/70 text-muted-foreground ring-1 ring-border/60 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:120ms]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/70 animate-bounce [animation-delay:240ms]" />
                    </div>
                    <span className="text-[11px] font-medium tracking-wide uppercase">
                      Thinking
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Gradient overlays */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-background/90 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/95 to-transparent" />
        </div>

        {/* Quick Start */}
        {showQuickStart && (
          <div className="border-t border-border/60 bg-background/70 backdrop-blur-md px-4 py-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wide uppercase text-muted-foreground">
                Quick Start
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() =>
                  sendMessage("I'm building a web application for a startup")
                }
                disabled={isLoading}
                className="h-7 px-3 text-[11px] rounded-full"
                variant="outline"
              >
                Web App Startup
              </Button>
              <Button
                onClick={() => sendMessage("I need an e-commerce website")}
                disabled={isLoading}
                className="h-7 px-3 text-[11px] rounded-full"
                variant="outline"
              >
                E-commerce Site
              </Button>
              <Button
                onClick={() =>
                  sendMessage("I'm building a dashboard/admin panel")
                }
                disabled={isLoading}
                className="h-7 px-3 text-[11px] rounded-full"
                variant="outline"
              >
                Dashboard/Admin
              </Button>
              <Button
                onClick={() => sendMessage("I need a high-performance API")}
                disabled={isLoading}
                className="h-7 px-3 text-[11px] rounded-full"
                variant="outline"
              >
                High-Performance API
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-border/70 bg-background/80 backdrop-blur-md px-4 py-4 space-y-4">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1 group/input">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Describe your project, constraints or ask about technologies..."
                className="w-full resize-none rounded-xl border border-border bg-background/70 px-4 py-3 pr-14 text-sm font-medium leading-relaxed shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary h-[54px] max-h-[160px] transition placeholder:text-muted-foreground/60"
                rows={2}
                disabled={isLoading}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <Button
                  onClick={() => sendMessage()}
                  disabled={!inputMessage.trim() || isLoading}
                  className="h-8 px-3 text-[12px] font-medium rounded-lg"
                  size="sm"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
          <ToggleSwitch
            pressed={forceSuggestions}
            onPressedChange={setForceSuggestions}
            disabled={isLoading}
            label="Force stack suggestions"
            description="When enabled, AI will always include explicit tech stack recommendations in its reply."
          />
        </div>
      </div>
    </>
  );
}
