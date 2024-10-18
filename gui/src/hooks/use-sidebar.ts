import { create } from "zustand";

type SidebarStore = {
  isOpen: boolean;
  isHover: boolean;
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  getOpenState: () => boolean;
};

export const useSidebar = create<SidebarStore>((set, get) => ({
  isOpen: true,
  isHover: false,
  toggleOpen: () => {
    set({ isOpen: !get().isOpen });
  },
  setIsOpen: (isOpen: boolean) => {
    set({ isOpen });
  },
  setIsHover: (isHover: boolean) => {
    set({ isHover });
  },
  getOpenState: () => {
    const state = get();

    return state.isOpen || state.isHover;
  },
}));
