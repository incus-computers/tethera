import { create } from "zustand";

interface HeaderState {
  isCategoryBarVisible: boolean;
  setIsCategoryBarVisible: (visible: boolean) => void;
}

export const useHeaderStore = create<HeaderState>((set) => ({
  isCategoryBarVisible: true,
  setIsCategoryBarVisible: (visible: boolean) => set({ isCategoryBarVisible: visible }),
}));
