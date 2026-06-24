"use client";
import { useEffect, useState, useRef } from "react";

const WORDS = ["Find", "Discover", "Connect"];
const COLORS = ["#BA8A33", "#2F6F62", "#8995B8"]; // gold, teal, ink-400

type Phase = "typing" | "pause" | "erasing";

export default function HeroTypewriter() {
  const [wordIndex, setWordIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [phase, setPhase] = useState<Phase>("typing");
  const [cursorVisible, setCursorVisible] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cursor blink
  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  // Typewriter state machine
  useEffect(() => {
    const word = WORDS[wordIndex];

    if (phase === "typing") {
      if (displayed.length < word.length) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(word.slice(0, displayed.length + 1));
        }, 90);
      } else {
        timeoutRef.current = setTimeout(() => setPhase("pause"), 1200);
      }
    }

    if (phase === "pause") {
      timeoutRef.current = setTimeout(() => setPhase("erasing"), 200);
    }

    if (phase === "erasing") {
      if (displayed.length > 0) {
        timeoutRef.current = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, 55);
      } else {
        const next = (wordIndex + 1) % WORDS.length;
        setWordIndex(next);
        setPhase("typing");
      }
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [displayed, phase, wordIndex]);

  const color = COLORS[wordIndex];

  return (
    <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-semibold text-paper leading-[1.1] tracking-tight">
      {/* Animated word with fixed-width container so layout doesn't jump */}
      <span
        className="inline-block min-w-[200px] sm:min-w-[260px] lg:min-w-[310px] transition-colors duration-300"
        style={{ color }}
      >
        {displayed}
        <span
          className="inline-block w-[3px] h-[0.85em] ml-[2px] align-middle rounded-sm transition-opacity duration-75"
          style={{
            background: color,
            opacity: cursorVisible ? 1 : 0,
          }}
        />
      </span>
      <br />
      <span className="text-paper">your perfect college</span>
    </h1>
  );
}