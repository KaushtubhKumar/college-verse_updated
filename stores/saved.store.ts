import { create } from "zustand";

interface SavedStore {
  savedIds: Set<string>;
  loaded: boolean;
  setIds: (ids: string[]) => void;
  addId: (id: string) => void;
  removeId: (id: string) => void;
  isSaved: (id: string) => boolean;
}

export const useSavedStore = create<SavedStore>()((set, get) => ({
  savedIds: new Set(),
  loaded: false,
  setIds: (ids) => set({ savedIds: new Set(ids), loaded: true }),
  addId: (id) => set((s) => ({ savedIds: new Set([...s.savedIds, id]) })),
  removeId: (id) => set((s) => {
    const next = new Set(s.savedIds);
    next.delete(id);
    return { savedIds: next };
  }),
  isSaved: (id) => get().savedIds.has(id),
}));