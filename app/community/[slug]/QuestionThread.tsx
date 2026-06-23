"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { LiveAnswer, LiveQuestion } from "@/hooks/useCommunitySocket";

type Question = LiveQuestion & { answers?: LiveAnswer[] };

interface Props {
  question: Question;
  communitySlug: string;
  onBack: () => void;
  onAnswerPosted: (questionId: string, answer: LiveAnswer) => void;
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

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const sz = size === "lg" ? "w-10 h-10 text-sm" : size === "sm" ? "w-7 h-7 text-[11px]" : "w-8 h-8 text-xs";
  return (
    <div className={`${sz} rounded-full bg-ink-950 flex items-center justify-center font-mono-label font-bold text-gold-400 flex-shrink-0`}>
      {initials}
    </div>
  );
}

export default function QuestionThread({ question, communitySlug, onBack, onAnswerPosted }: Props) {
  const { data: session } = useSession();
  const [answers, setAnswers] = useState<LiveAnswer[]>(question.answers || []);
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!question.answers);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (question.answers) { setLoading(false); return; }
    fetch(`/api/community/${communitySlug}/questions/${question.id}/answers`)
      .then((r) => r.json())
      .then((d) => setAnswers(d.question?.answers || []))
      .finally(() => setLoading(false));
  }, [question.id, question.answers, communitySlug]);

  useEffect(() => {
    setAnswers(question.answers || []);
  }, [question.answers]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError("");
    const authorName = session?.user?.name || guestName || "Anonymous";
    try {
      const res = await fetch(`/api/community/${communitySlug}/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, authorName }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); return; }
      const newAnswer: LiveAnswer = data.answer;
      setAnswers((prev) => [...prev, newAnswer]);
      onAnswerPosted(question.id, newAnswer);
      setBody(""); setGuestName("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Failed to post answer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">

      {/* Back */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-charcoal transition-colors group"
      >
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to questions
      </button>

      {/* Question card */}
      <div className="bg-white rounded-2xl border border-line overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-gold-500 to-gold-300" />
        <div className="p-6">
          <h2 className="font-display text-xl font-semibold text-charcoal leading-snug mb-3">{question.title}</h2>
          <p className="text-charcoal/80 text-sm leading-relaxed whitespace-pre-line">{question.body}</p>
          <div className="flex items-center gap-3 mt-5 pt-4 border-t border-line">
            <Avatar name={question.authorName} size="sm" />
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-semibold text-charcoal">{question.authorName}</span>
              <span>·</span>
              <span className="font-mono-label">{timeAgo(question.createdAt)}</span>
              <span>·</span>
              <span className="tabular">{answers.length} {answers.length === 1 ? "answer" : "answers"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answers section header */}
      {(answers.length > 0 || loading) && (
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-charcoal">{answers.length} {answers.length === 1 ? "Answer" : "Answers"}</p>
          <div className="flex-1 h-px bg-line" />
        </div>
      )}

      {/* Answers */}
      <div className="space-y-3">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl border border-line p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-paper-dim" />
                  <div className="h-3 bg-paper-dim rounded w-24" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 bg-paper-dim rounded w-full" />
                  <div className="h-3 bg-paper-dim rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : answers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-line">
            <p className="text-sm font-semibold text-charcoal mb-1">No answers yet</p>
            <p className="text-xs text-muted">Be the first to help</p>
          </div>
        ) : (
          answers.map((a, i) => (
            <div
              key={a.id}
              className={`bg-white rounded-2xl border p-5 ${i === 0 && answers.length > 1 ? "border-teal-100" : "border-line"}`}
            >
              <div className="flex items-start gap-3">
                <Avatar name={a.authorName} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span className="text-sm font-semibold text-charcoal">{a.authorName}</span>
                    <span className="text-xs text-muted font-mono-label">{timeAgo(a.createdAt)}</span>
                    {i === 0 && answers.length > 1 && (
                      <span className="ml-auto text-[10px] font-mono-label font-bold uppercase tracking-wide text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                        First answer
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-charcoal/90 leading-relaxed whitespace-pre-line">{a.body}</p>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Answer form */}
      <div className="bg-white rounded-2xl border border-line p-6">
        <h3 className="font-display font-semibold text-charcoal mb-5">Write an answer</h3>
        {error && (
          <div className="bg-error-100 border border-error/20 text-error text-sm px-4 py-3 rounded-xl mb-4">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!session && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">
                Your name <span className="text-muted font-normal">(optional)</span>
              </label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Anonymous"
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500"
              />
            </div>
          )}
          <div>
            <textarea
              required
              rows={5}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your experience, advice, or perspective — be specific and helpful…"
              className="w-full px-4 py-3 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500 resize-none"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className="bg-ink-950 hover:bg-ink-800 text-paper font-semibold text-sm px-6 py-2.5 rounded-full transition-colors disabled:opacity-40"
            >
              {submitting ? "Posting…" : "Post answer"}
            </button>
            <p className="text-xs text-muted">
              {session ? `Posting as ${session.user.name || session.user.email}` : "Posting anonymously"}
            </p>
          </div>
        </form>
      </div>

    </div>
  );
}
