"use client";
import { useState, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useCommunitySocket, type LiveQuestion, type LiveAnswer } from "@/hooks/useCommunitySocket";
import QuestionThread from "./QuestionThread";

interface Community {
  id: string;
  slug: string;
  subject: string;
  description: string;
  icon?: string;
}

type Question = LiveQuestion & { answers?: LiveAnswer[] };

interface Props {
  community: Community;
  initialQuestions: Question[];
  initialTotal: number;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-xs";
  return (
    <div className={`${sz} rounded-full bg-ink-950 flex items-center justify-center font-mono-label font-bold text-gold-400 flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function CommunityRoom({ community, initialQuestions, initialTotal }: Props) {
  const { data: session } = useSession();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [total, setTotal] = useState(initialTotal);
  const [onlineCount, setOnlineCount] = useState(1);
  const [activeQuestion, setActiveQuestion] = useState<Question | null>(null);
  const [showAskForm, setShowAskForm] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [newBadge, setNewBadge] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNewQuestion = useCallback((q: LiveQuestion) => {
    setQuestions((prev) => [q, ...prev]);
    setTotal((t) => t + 1);
    setNewBadge(q.id);
    setTimeout(() => setNewBadge(null), 4000);
  }, []);

  const handleNewAnswer = useCallback((questionId: string, answer: LiveAnswer) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? { ...q, _count: { answers: q._count.answers + 1 }, answers: [...(q.answers || []), answer] }
          : q
      )
    );
    setActiveQuestion((prev) =>
      prev && prev.id === questionId
        ? { ...prev, _count: { answers: prev._count.answers + 1 }, answers: [...(prev.answers || []), answer] }
        : prev
    );
  }, []);

  const handleTyping = useCallback((authorName: string) => {
    setTypingUser(authorName);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTypingUser(null), 2500);
  }, []);

  const { emitQuestion, emitAnswer, emitTyping } = useCommunitySocket({
    roomId: `community:${community.slug}`,
    onNewQuestion: handleNewQuestion,
    onNewAnswer: handleNewAnswer,
    onUsersCount: setOnlineCount,
    onUserTyping: handleTyping,
  });

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError("");
    const authorName = session?.user?.name || guestName || "Anonymous";
    try {
      const res = await fetch(`/api/community/${community.slug}/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, authorName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      const newQ: Question = { ...data.question, answers: [] };
      setQuestions((prev) => [newQ, ...prev]);
      setTotal((t) => t + 1);
      emitQuestion(newQ);
      setTitle(""); setBody(""); setGuestName(""); setShowAskForm(false);
    } catch {
      setError("Failed to post question");
    } finally {
      setSubmitting(false);
    }
  }

  function handleAnswerPosted(questionId: string, answer: LiveAnswer) {
    handleNewAnswer(questionId, answer);
    emitAnswer(questionId, answer);
  }

  function handleBodyChange(val: string) {
    setBody(val);
    emitTyping(session?.user?.name || guestName || "Someone");
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

      {/* ── Room header ── */}
      <div className="relative bg-ink-950 rounded-3xl overflow-hidden mb-8">
        {/* Background texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(ellipse at 80% 0%, white, transparent 60%)" }} />

        <div className="relative p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {/* Breadcrumb */}
              <Link href="/community" className="inline-flex items-center gap-1.5 text-ink-400 hover:text-ink-200 text-xs font-mono-label transition-colors mb-4">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Communities
              </Link>

              <h1 className="font-display text-2xl sm:text-3xl font-semibold text-white leading-tight">{community.subject}</h1>
              <p className="text-ink-300 text-sm mt-2 leading-relaxed max-w-lg">{community.description}</p>
            </div>

            {/* Live stats */}
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                <span className="text-white text-xs font-mono-label font-semibold">{onlineCount} online</span>
              </div>
              <span className="text-ink-400 text-xs font-mono-label tabular">{total} questions</span>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setShowAskForm((v) => !v)}
              className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
            >
              {showAskForm ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                  Cancel
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Ask a question
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Ask form ── */}
      {showAskForm && (
        <div className="bg-white rounded-2xl border border-gold-500/30 shadow-[0_4px_24px_-8px_rgba(186,138,51,0.15)] p-6 mb-6">
          <h2 className="font-display font-semibold text-charcoal text-lg mb-5">Ask the community</h2>
          {error && (
            <div className="bg-error-100 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
          )}
          <form onSubmit={handleAsk} className="space-y-4">
            {!session && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Your name <span className="text-muted font-normal">(optional)</span></label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
                />
              </div>
            )}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-charcoal">Question <span className="text-clay-600">*</span></label>
                <span className="text-xs font-mono-label text-muted tabular">{title.length}/200</span>
              </div>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Which NIT is best for CSE placements?"
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Context <span className="text-clay-600">*</span></label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Add background, what you've already considered, your constraints…"
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 resize-none"
              />
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="bg-ink-950 hover:bg-ink-800 text-paper font-semibold text-sm px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post question"}
              </button>
              <button
                type="button"
                onClick={() => setShowAskForm(false)}
                className="text-sm text-muted hover:text-charcoal px-4 py-2.5 rounded-full border border-line hover:bg-paper-dim transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Typing indicator ── */}
      {typingUser && (
        <div className="flex items-center gap-2 text-sm text-muted mb-3 px-1">
          <span className="flex gap-0.5 items-center">
            {[0,1,2].map(i => (
              <span key={i} className="w-1 h-1 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: `${i * 0.12}s` }} />
            ))}
          </span>
          <span>{typingUser} is typing</span>
        </div>
      )}

      {/* ── Question list / Thread ── */}
      {activeQuestion ? (
        <QuestionThread
          question={activeQuestion}
          communitySlug={community.slug}
          onBack={() => setActiveQuestion(null)}
          onAnswerPosted={handleAnswerPosted}
        />
      ) : (
        <div className="space-y-2">
          {questions.length === 0 && (
            <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-line">
              <div className="w-12 h-12 rounded-2xl bg-paper-dim mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              </div>
              <p className="font-display font-semibold text-charcoal mb-1">No questions yet</p>
              <p className="text-sm text-muted">Start the conversation</p>
            </div>
          )}

          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestion(q)}
              className={`w-full text-left bg-white rounded-2xl border transition-all duration-150 p-5 group hover:border-gold-500/50 hover:shadow-[0_4px_16px_-6px_rgba(20,31,60,0.12)] ${
                newBadge === q.id
                  ? "border-gold-500 ring-2 ring-gold-100 shadow-sm"
                  : "border-line"
              }`}
            >
              <div className="flex items-start gap-4">
                <Avatar name={q.authorName} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    {newBadge === q.id && (
                      <span className="text-[10px] font-mono-label font-bold text-ink-950 bg-gold-100 border border-gold-500/30 px-2 py-0.5 rounded-full">New</span>
                    )}
                    <h3 className="font-display font-semibold text-charcoal text-base leading-snug group-hover:text-ink-800 transition-colors line-clamp-2">{q.title}</h3>
                  </div>
                  <p className="text-sm text-muted line-clamp-2 leading-relaxed">{q.body}</p>

                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs font-semibold text-charcoal">{q.authorName}</span>
                    <span className="text-muted text-xs">·</span>
                    <span className="text-xs text-muted font-mono-label">{timeAgo(q.createdAt)}</span>
                    <span className="text-muted text-xs">·</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted">
                      <svg className="w-3.5 h-3.5 text-ink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      <span className="tabular">{q._count.answers}</span>
                    </span>
                  </div>
                </div>

                <svg className="w-4 h-4 text-ink-200 group-hover:text-ink-700 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
