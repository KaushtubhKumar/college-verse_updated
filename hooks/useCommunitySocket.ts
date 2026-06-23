"use client";
import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";

export interface LiveQuestion {
  id: string;
  authorName: string;
  title: string;
  body: string;
  createdAt: string;
  _count: { answers: number };
}

export interface LiveAnswer {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
}

interface UseCommunitySocketOptions {
  roomId: string;
  onNewQuestion: (q: LiveQuestion) => void;
  onNewAnswer: (questionId: string, a: LiveAnswer) => void;
  onUsersCount: (count: number) => void;
  onUserTyping?: (authorName: string) => void;
}

export function useCommunitySocket({
  roomId,
  onNewQuestion,
  onNewAnswer,
  onUsersCount,
  onUserTyping,
}: UseCommunitySocketOptions) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join_room", { roomId });
    });

    socket.on("new_question", ({ question }: { question: LiveQuestion }) => {
      onNewQuestion(question);
    });

    socket.on("new_answer", ({ questionId, answer }: { questionId: string; answer: LiveAnswer }) => {
      onNewAnswer(questionId, answer);
    });

    socket.on("room_users", ({ count }: { count: number }) => {
      onUsersCount(count);
    });

    socket.on("user_typing", ({ authorName }: { authorName: string }) => {
      onUserTyping?.(authorName);
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const emitQuestion = useCallback((question: LiveQuestion) => {
    socketRef.current?.emit("post_question", { roomId, question });
  }, [roomId]);

  const emitAnswer = useCallback((questionId: string, answer: LiveAnswer) => {
    socketRef.current?.emit("post_answer", { roomId, questionId, answer });
  }, [roomId]);

  const emitTyping = useCallback((authorName: string) => {
    socketRef.current?.emit("typing", { roomId, authorName });
  }, [roomId]);

  return { emitQuestion, emitAnswer, emitTyping };
}
