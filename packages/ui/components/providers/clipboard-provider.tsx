import { createContext } from "react";

export interface ClickToCopyProps {
  text: string | bigint | number;
  children: React.ReactNode;
  write?: (text: string) => void;
}

interface IClipboard {
  writeText: (text: string) => Promise<unknown>;
}

export const ClipboardContext = createContext<IClipboard>(navigator.clipboard);

interface ClipboardProviderProps {
  children: React.ReactNode;
  clipboard?: IClipboard;
}

export function ClipboardProvider({
  children,
  clipboard = navigator.clipboard,
}: ClipboardProviderProps) {
  return (
    <ClipboardContext.Provider value={clipboard}>
      {children}
    </ClipboardContext.Provider>
  );
}
