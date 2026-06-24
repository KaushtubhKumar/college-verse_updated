import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedComparison {
  id: string;            // nanoid
  name: string;          // user-given label e.g. "IIT Bombay vs IIT Delhi"
  ids: string[];         // college ids
  names: string[];       // college names for display
  savedAt: number;       // Date.now()
}

interface SavedComparisonsStore {
  comparisons: SavedComparison[];
  save: (comparison: Omit<SavedComparison, "id" | "savedAt">) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  hasComparison: (ids: string[]) => boolean;
}

function nanoid() {
  return Math.random().toString(36).slice(2, 10);
}

export const useSavedComparisonsStore = create<SavedComparisonsStore>()(
  persist(
    (set, get) => ({
      comparisons: [],
      save: (comparison) =>
        set((s) => ({
          comparisons: [
            { ...comparison, id: nanoid(), savedAt: Date.now() },
            ...s.comparisons.slice(0, 19), // keep last 20
          ],
        })),
      remove: (id) =>
        set((s) => ({ comparisons: s.comparisons.filter((c) => c.id !== id) })),
      rename: (id, name) =>
        set((s) => ({
          comparisons: s.comparisons.map((c) => (c.id === id ? { ...c, name } : c)),
        })),
      hasComparison: (ids) =>
        get().comparisons.some(
          (c) =>
            c.ids.length === ids.length &&
            [...ids].sort().join(",") === [...c.ids].sort().join(",")
        ),
    }),
    { name: "saved-comparisons" }
  )
);