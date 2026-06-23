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
      setBody("");
      setGuestName("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch {
      setError("Failed to post answer");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted hover:text-gold-600 transition-colors group">
        <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        Back to questions
      </button>

      {/* Question */}
      <div className="bg-white rounded-2xl border border-line p-6">
        <h2 className="font-display text-xl font-semibold text-charcoal leading-snug mb-3">{question.title}</h2>
        <p className="text-charcoal/80 text-sm leading-relaxed whitespace-pre-line">{question.body}</p>
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-line text-xs text-muted">
          <span className="font-medium text-charcoal">{question.authorName}</span>
          <span>·</span>
          <span>{timeAgo(question.createdAt)}</span>
          <span>·</span>
          <span>{answers.length} {answers.length === 1 ? "answer" : "answers"}</span>
        </div>
      </div>

      {/* Answers */}
      <div className="space-y-3">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1,2].map(i => <div key={i} className="h-28 bg-paper-dim rounded-2xl" />)}
          </div>
        ) : answers.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-line">
            <p className="text-sm text-muted">No answers yet — be the first to help</p>
          </div>
        ) : (
          answers.map((a, i) => (
            <div key={a.id} className="bg-white rounded-2xl border border-line p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-ink-950 flex items-center justify-center text-xs font-mono-label font-bold text-gold-500 flex-shrink-0">
                  {a.authorName[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-charcoal">{a.authorName}</span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs text-muted">{timeAgo(a.createdAt)}</span>
                {i === 0 && answers.length > 1 && (
                  <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full ml-auto font-medium">First answer</span>
                )}
              </div>
              <p className="text-sm text-charcoal/90 leading-relaxed whitespace-pre-line">{a.body}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Answer form */}
      <div className="bg-white rounded-2xl border border-line p-6">
        <h3 className="font-display font-semibold text-charcoal mb-4">Write an answer</h3>
        {error && <div className="bg-error-100 border border-error/20 text-error text-sm px-4 py-2.5 rounded-xl mb-4">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!session && (
            <div>
              <label className="block text-sm font-medium text-charcoal mb-1.5">Your name (optional)</label>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Anonymous"
                className="w-full px-4 py-2.5 rounded-xl border border-line text-sm focus:outline-none focus:ring-2 focus:ring-gold-500"
              />
            </div>
          )}
          <div>
            <textarea
              required
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share your knowledge, experience, or perspective…"
              className="w-full px-4 py-3 rounded-xl border border-line text-sm text-charcoal placeholder-muted focus:outline-none focus:ring-2 focus:ring-gold-500 resize-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="bg-ink-900 hover:bg-ink-800 text-paper font-semibold text-sm px-6 py-2.5 rounded-full transition-colors disabled:opacity-50"
          >
            {submitting ? "Posting…" : "Post answer"}
          </button>
        </form>
      </div>
    </div>
  );
}
