import { create } from "zustand";

interface GlobalState {
  isGlobalLoading: boolean;
  setGlobalLoading: (val: boolean) => void;

  refreshSignal: number;
  triggerRefresh: () => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  isGlobalLoading: false,
  refreshSignal: 0,

  setGlobalLoading: (val) => set({ isGlobalLoading: val }),

  triggerRefresh: () =>
    set((state) => ({ refreshSignal: state.refreshSignal + 1 })),
}));
