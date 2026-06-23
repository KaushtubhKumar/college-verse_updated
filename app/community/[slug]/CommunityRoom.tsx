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
  icon: string;
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

      setTitle("");
      setBody("");
      setGuestName("");
      setShowAskForm(false);
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
    const name = session?.user?.name || guestName || "Someone";
    emitTyping(name);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-ink-950 rounded-[1.75rem] p-6 text-paper mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 88% 10%, white 0, transparent 40%)" }} />
        <div className="flex items-start justify-between gap-4 relative">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-xl">{community.icon}</span>
              <h1 className="font-display text-2xl font-semibold">{community.subject}</h1>
            </div>
            <p className="text-ink-200 text-sm leading-relaxed max-w-xl">{community.description}</p>
          </div>
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 bg-white/10 rounded-full px-3 py-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-sm font-medium font-mono-label">{onlineCount} online</span>
            </div>
            <span className="text-xs text-ink-200 font-mono-label">{total} questions</span>
          </div>
        </div>
        <div className="mt-4 relative">
          <button
            onClick={() => setShowAskForm((v) => !v)}
            className="bg-gold-500 hover:bg-gold-600 text-ink-950 font-semibold text-sm px-5 py-2.5 rounded-full transition-colors"
          >
            {showAskForm ? "Cancel" : "Ask a question"}
          </button>
        </div>
      </div>

      {/* Ask form */}
      {showAskForm && (
        <div className="bg-white rounded-2xl border border-gold-500/40 p-6 mb-6 shadow-sm">
          <h2 className="font-display font-semibold text-charcoal mb-4">Ask the community</h2>
          {error && <div className="bg-error-100 text-error text-sm px-4 py-2.5 rounded-xl mb-4 border border-error/20">{error}</div>}
          <form onSubmit={handleAsk} className="space-y-4">
            {!session && (
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1.5">Your name (optional)</label>
                <input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Anonymous"
                  className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Question title <span className="text-clay-600">*</span></label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Which NIT is best for CSE placements?"
                maxLength={200}
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
              <p className="text-xs text-muted mt-1 font-mono-label">{title.length}/200</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Details <span className="text-clay-600">*</span></label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => handleBodyChange(e.target.value)}
                placeholder="Add context, your background, what you've already considered…"
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-ink-900 hover:bg-ink-800 text-paper font-semibold text-sm px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
              >
                {submitting ? "Posting…" : "Post question"}
              </button>
              <button
                type="button"
                onClick={() => setShowAskForm(false)}
                className="text-sm font-medium text-muted px-4 py-2.5 rounded-full border border-line hover:bg-paper-dim transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Typing indicator */}
      {typingUser && (
        <div className="flex items-center gap-2 text-sm text-muted mb-3 px-1">
          <span className="flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-ink-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          <span>{typingUser} is typing…</span>
        </div>
      )}

      {/* Question list or thread view */}
      {activeQuestion ? (
        <QuestionThread
          question={activeQuestion}
          communitySlug={community.slug}
          onBack={() => setActiveQuestion(null)}
          onAnswerPosted={handleAnswerPosted}
        />
      ) : (
        <div className="space-y-3">
          {questions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-line">
              <p className="font-display text-lg text-charcoal mb-1">No questions yet</p>
              <p className="text-sm text-muted">Be the first to ask something</p>
            </div>
          )}
          {questions.map((q) => (
            <button
              key={q.id}
              onClick={() => setActiveQuestion(q)}
              className={`w-full text-left bg-white rounded-2xl border transition-all p-5 hover:border-gold-500/60 hover:shadow-sm ${
                newBadge === q.id ? "border-gold-500 shadow-md ring-2 ring-gold-100" : "border-line"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {newBadge === q.id && (
                      <span className="text-xs font-mono-label font-semibold text-ink-950 bg-gold-100 px-2 py-0.5 rounded-full animate-pulse">New</span>
                    )}
                    <h3 className="font-display font-semibold text-charcoal text-base leading-snug">{q.title}</h3>
                  </div>
                  <p className="text-sm text-muted line-clamp-2 mt-0.5">{q.body}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-muted">
                    <span className="font-medium text-charcoal">{q.authorName}</span>
                    <span>·</span>
                    <span>{timeAgo(q.createdAt)}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                      {q._count.answers} {q._count.answers === 1 ? "answer" : "answers"}
                    </span>
                  </div>
                </div>
                <svg className="w-4 h-4 text-ink-400 flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6">
        <Link href="/community" className="text-sm text-muted hover:text-gold-600 transition-colors">← All communities</Link>
      </div>
    </div>
  );
}
