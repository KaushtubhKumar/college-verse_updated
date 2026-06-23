import { create } from "zustand";
import { persist } from "zustand/middleware";

interface CompareItem {
  id: string;
  name: string;
  slug: string;
}

interface CompareStore {
  colleges: CompareItem[];
  addCollege: (college: CompareItem) => void;
  removeCollege: (id: string) => void;
  clear: () => void;
  isInCompare: (id: string) => boolean;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      colleges: [],
      addCollege: (college) =>
        set((state) => {
          if (state.colleges.length >= 3 || state.colleges.find((c) => c.id === college.id))
            return state;
          return { colleges: [...state.colleges, college] };
        }),
      removeCollege: (id) =>
        set((state) => ({ colleges: state.colleges.filter((c) => c.id !== id) })),
      clear: () => set({ colleges: [] }),
      isInCompare: (id) => get().colleges.some((c) => c.id === id),
    }),
    { name: "compare-store" }
  )
);
