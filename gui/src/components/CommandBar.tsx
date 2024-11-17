import {
  type Dispatch,
  Fragment,
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { useShallow } from "zustand/shallow";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ethui/ui/components/shadcn/command";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { useSettingsWindow } from "#/store/useSettingsWindow";
import { useTheme } from "#/store/useTheme";
import { useWallets } from "#/store/useWallets";

export interface Action {
  id: string;
  text: string;
  run?: () => void;
}

interface CommandBarContextProps {
  open: boolean;
  setOpen: Dispatch<React.SetStateAction<boolean>>;
}

const CommandBarContext = createContext<CommandBarContextProps>({
  open: false,
  setOpen: () => {},
});

export function CommandBarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <CommandBarContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandBarContext.Provider>
  );
}

export const useCommandBar = () => useContext(CommandBarContext);

function useActions(): Record<string, Action[]> {
  const walletActions = useWallets((s) => s.actions);
  const networkActions = useNetworks((s) => s.actions);
  const settingsActions = useSettings((s) => s.actions);
  const themeActions = useTheme(useShallow((s) => s.actions));
  const settingsWindowActions = useSettingsWindow((s) => s.actions);

  return {
    Network: networkActions,
    Settings: settingsActions,
    Theme: themeActions,
    SettingsWindow: settingsWindowActions,
    Wallet: walletActions,
  };
}

export function CommandBar() {
  const { open, setOpen } = useCommandBar();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };

    document.addEventListener("keydown", down);
    return () => {
      document.removeEventListener("keydown", down);
    };
  }, [setOpen]);
  const actions = useActions();

  if (actions.Wallet.length === 0) return null;

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search" />
      <CommandList>
        <CommandEmpty>No commands found</CommandEmpty>
        {Object.keys(actions).map((group) => {
          const items = actions[group];
          return (
            <Fragment key={group}>
              <CommandGroup heading={group}>
                {items.map((item) => (
                  <CommandItem
                    key={item.id}
                    onSelect={() => {
                      item.run?.();
                      setOpen(false);
                    }}
                    keywords={[group]}
                  >
                    {item.text}
                  </CommandItem>
                ))}
              </CommandGroup>
            </Fragment>
          );
        })}
      </CommandList>
    </CommandDialog>
  );
}
