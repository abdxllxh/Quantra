"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAppStore, type SmartCleaningTarget, type TabType } from "@/lib/store";
import { api } from "@/lib/api";
import { DatasetDetail, AskQuestionResponse } from "@/types/api";
import {
  MessageSquareCode,
  Send,
  Sparkles,
  ShieldCheck,
  Terminal,
  Loader2,
  ArrowRight,
} from "lucide-react";

interface AskDataViewProps {
  dataset: DatasetDetail;
  onRefresh: () => void;
}

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  responsePayload?: AskQuestionResponse;
  cleaningTarget?: SmartCleaningTarget;
}

// Clean and render formatted Copilot messages
const renderInlineFormatting = (text: string) => {
  // Strip emojis from text if any
  const clean = text.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "").trim();

  // Split by bold (**text**) and code (`code`)
  const parts = clean.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] font-mono text-[11px] font-semibold text-[var(--accent)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
};

const CopilotFormattedMessage: React.FC<{ content: string; isUser: boolean }> = ({ content, isUser }) => {
  if (isUser) {
    return <div className="font-sans font-medium">{content}</div>;
  }

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let currentList: React.ReactNode[] = [];
  let isNumberedList = false;

  const flushList = () => {
    if (currentList.length > 0) {
      if (isNumberedList) {
        elements.push(
          <ol key={`ol-${elements.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`ul-${elements.length}`} className="space-y-1.5 my-2 pl-1">
            {currentList}
          </ul>
        );
      }
      currentList = [];
    }
  };

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      return;
    }

    // Check for Headings (#, ##, ###)
    const headingMatch = line.match(/^#{1,4}\s+(.*)/);
    if (headingMatch) {
      flushList();
      const headingText = headingMatch[1].replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/gu, "").trim();
      elements.push(
        <div
          key={`h-${idx}`}
          className="text-[13px] font-bold font-display text-[var(--text-primary)] border-b border-[var(--border-subtle)] pb-1 pt-3 mb-1.5 first:pt-0"
        >
          {headingText}
        </div>
      );
      return;
    }

    // Check for Numbered items (e.g. "1. ", "2. ")
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      if (currentList.length > 0 && !isNumberedList) flushList();
      isNumberedList = true;
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2 text-xs leading-relaxed text-[var(--text-primary)]">
          <span className="font-mono font-bold text-[var(--accent)] shrink-0 min-w-[18px]">
            {numMatch[1]}.
          </span>
          <div className="flex-1">{renderInlineFormatting(numMatch[2])}</div>
        </li>
      );
      return;
    }

    // Check for Bullet items (•, -, *)
    const bulletMatch = line.match(/^([•\-\*])\s+(.*)/);
    if (bulletMatch) {
      if (currentList.length > 0 && isNumberedList) flushList();
      isNumberedList = false;
      currentList.push(
        <li key={`li-${idx}`} className="flex items-start gap-2.5 text-xs leading-relaxed text-[var(--text-primary)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] shrink-0 mt-1.5" />
          <div className="flex-1">{renderInlineFormatting(bulletMatch[2])}</div>
        </li>
      );
      return;
    }

    // Regular paragraph text
    flushList();
    elements.push(
      <p key={`p-${idx}`} className="text-xs leading-relaxed text-[var(--text-secondary)] my-1">
        {renderInlineFormatting(line)}
      </p>
    );
  });

  flushList();

  return <div className="space-y-1">{elements}</div>;
};

const inferCleaningTarget = (question: string): SmartCleaningTarget | undefined => {
  const value = question.toLowerCase();
  if (value.includes("duplicate") || value.includes("dedup")) return "duplicates";
  if (value.includes("missing") || value.includes("null") || value.includes("impute")) return "missing";
  if (value.includes("whitespace") || value.includes("trim") || value.includes("text")) return "text";
  if (value.includes("date")) return "dates";
  if (value.includes("outlier")) return "outliers";
  if (value.includes("type") || value.includes("convert")) return "types";
  if (value.includes("clean")) return "duplicates";
  return undefined;
};

const sectionActions: Record<string, { label: string; tab?: TabType }> = {
  dashboard: { label: "Open Dashboard", tab: "overview" },
  upload: { label: "Open Upload Center" },
  profiling: { label: "Open Data Profiling", tab: "profiling" },
  "smart-cleaning": { label: "Open Smart Cleaning", tab: "smart_cleaning" },
  transformation: { label: "Open Transformation", tab: "clean" },
  visualizations: { label: "Open Visualizations", tab: "charts" },
  insights: { label: "Open Business Insights", tab: "analytics" },
  copilot: { label: "Open Quantura Copilot", tab: "ask" },
  chat: { label: "Open Quantura Copilot", tab: "ask" },
  forecasting: { label: "Open Forecasting", tab: "forecasting" },
  "anomaly-detection": { label: "Open Anomaly Detection", tab: "anomalies" },
  "customer-analytics": { label: "Open Customer Analytics", tab: "grid" },
  "issue-center": { label: "Open Issue Center", tab: "issues" },
  sql: { label: "Open SQL & DuckDB", tab: "sql_workspace" },
  reports: { label: "Open Report Generator", tab: "report_generator" },
  export: { label: "Open Export Data", tab: "export" },
  history: { label: "Open Project History", tab: "project_history" },
  settings: { label: "Open Settings", tab: "settings" },
  admin: { label: "Open Admin Panel", tab: "admin_panel" },
  "how-it-works": { label: "Open How It Works", tab: "documentation" },
};
const CopilotChart = dynamic(() => import("./CopilotChart"), {
  ssr: false,
  loading: () => <div className="mt-3 h-48 animate-pulse rounded-lg bg-[var(--bg-elevated)]" aria-label="Loading chart" />,
});

export const AskDataView: React.FC<AskDataViewProps> = ({ dataset, onRefresh }) => {
  const { setActiveTab, setUploadModalOpen, setSmartCleaningTarget } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [privacyMode, setPrivacyMode] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getSuggestedQuestions(dataset.id).then((res) => {
      setSuggestions(res.suggested_questions || []);
    }).catch(console.error);

    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: `Hello! I am Quantura Copilot for ${dataset.name}.\n\nAsk me about its metrics, trends, correlations, anomalies, cleaning options, or where to find a workspace feature. Every numerical answer is computed from the active dataset.`,
      },
    ]);
  }, [dataset.id, dataset.name]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (qText?: string) => {
    const questionToSend = qText || inputQuestion.trim();
    if (!questionToSend || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: questionToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion("");
    setLoading(true);

    try {
      const res = await api.askCopilot(dataset.id, questionToSend, privacyMode);
      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "assistant",
        text: res.answer || "No response received.",
        responsePayload: res,
        cleaningTarget: inferCleaningTarget(questionToSend),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "assistant",
          text: `I encountered an error executing that query: ${err.message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (message: ChatMessage) => {
    const targetSection = message.responsePayload?.target_section;
    if (!targetSection) return;
    if (targetSection === "upload") {
      setUploadModalOpen(true);
      return;
    }
    if (targetSection === "smart-cleaning" && message.cleaningTarget) {
      setSmartCleaningTarget(message.cleaningTarget);
    }
    const action = sectionActions[targetSection];
    if (action?.tab) setActiveTab(action.tab);
  };

  return (
    <div className="max-w-5xl mx-auto h-[calc(100vh-6rem)] flex flex-col justify-between space-y-4 pb-6 text-[var(--text-primary)] select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[var(--accent-subtle)] text-[var(--accent)] font-mono text-[10px] font-bold mb-1">
            <MessageSquareCode className="w-3.5 h-3.5 stroke-[1.75]" />
            <span>Dataset-grounded Copilot</span>
          </div>
          <h2 className="text-xl font-bold font-display tracking-tight text-[var(--text-primary)]">
            Quantura Copilot
          </h2>
        </div>

        <button
          onClick={() => setPrivacyMode(!privacyMode)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono border transition cursor-pointer ${
            privacyMode
              ? "bg-[var(--signal-success-subtle)] border-[var(--signal-success)] text-[var(--signal-success)] font-bold"
              : "bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-secondary)]"
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy Mode: {privacyMode ? "ENFORCED" : "STANDARD"}</span>
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1.5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "assistant" && (
              <div className="w-8 h-8 rounded-lg bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed space-y-3 ${
                msg.sender === "user"
                  ? "bg-[var(--accent)] text-white font-medium rounded-tr-none shadow-sm"
                  : "card-graphite text-[var(--text-primary)] bg-[var(--bg-surface)] rounded-tl-none font-medium shadow-2xs border border-[var(--border-subtle)]"
              }`}
            >
              <CopilotFormattedMessage content={msg.text} isUser={msg.sender === "user"} />

              {msg.responsePayload?.recommended_chart && (
                <CopilotChart chart={msg.responsePayload.recommended_chart} />
              )}

              {msg.responsePayload?.target_section && sectionActions[msg.responsePayload.target_section] && (
                <button
                  type="button"
                  onClick={() => handleNavigate(msg)}
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)] cursor-pointer"
                  aria-label={`${sectionActions[msg.responsePayload.target_section].label} for this recommendation`}
                >
                  <span>{sectionActions[msg.responsePayload.target_section].label}</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}

              {/* Tool Execution Verification Card */}
              {msg.responsePayload?.tool_calls && msg.responsePayload.tool_calls.length > 0 && (
                <div className="pt-2.5 border-t border-[var(--border-subtle)] space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase text-[var(--accent)]">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Deterministic Python Execution Verified</span>
                  </div>
                  <div className="p-2.5 rounded bg-[var(--code-bg)] text-[var(--code-text)] font-mono text-[11px] overflow-x-auto">
                    <code>
                      {msg.responsePayload.tool_calls.map((t) => `# Function: ${t.tool_name}\n${JSON.stringify(t.arguments, null, 2)}`).join("\n")}
                    </code>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-secondary)] p-2">
            <Loader2 className="w-4 h-4 text-[var(--accent)] animate-spin" />
            <span>Quantura Copilot is analyzing the active dataset...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions Pills & Input */}
      <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
        {suggestions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto text-xs pb-1">
            <span className="text-[10px] font-mono font-bold uppercase text-[var(--text-secondary)]">SUGGESTED:</span>
            {suggestions.slice(0, 3).map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--accent)] transition whitespace-nowrap cursor-pointer shadow-2xs"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask Quantura Copilot about your data or workspace..."
            className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-2xs font-medium"
          />
          <button
            type="submit"
            disabled={!inputQuestion.trim() || loading}
            className="btn-primary text-xs py-2.5 px-4 cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
