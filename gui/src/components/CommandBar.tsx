import { ChainView } from "@ethui/ui/components/chain-view";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@ethui/ui/components/shadcn/command";
import { ChevronRight } from "lucide-react";
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useShallow } from "zustand/shallow";
import { useNetworks } from "#/store/useNetworks";
import { useSettings } from "#/store/useSettings";
import { useTheme } from "#/store/useTheme";
import { useWallets } from "#/store/useWallets";

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

  const onClose = () => {
    setOpen(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search" />
      <CommandList>
        <CommandEmpty>No commands found</CommandEmpty>
        <NetworkCommands onClose={onClose} />
        <WalletCommands onClose={onClose} />
        <FastModeCommands onClose={onClose} />
        <ThemeCommands onClose={onClose} />
      </CommandList>
    </CommandDialog>
  );
}

function FastModeCommands({ onClose }: { onClose: () => void }) {
  const setFastMode = useSettings((s) => s.setFastMode);

  return (
    <CommandGroup heading="Fast Mode">
      <CommandItem
        keywords={["enable", "fast", "mode"]}
        onSelect={() => {
          setFastMode(true);
          onClose();
        }}
      >
        Enable
      </CommandItem>
      <CommandItem
        keywords={["disable", "fast", "mode"]}
        onSelect={() => {
          setFastMode(false);
          onClose();
        }}
      >
        Disable
      </CommandItem>
    </CommandGroup>
  );
}

function NetworkCommands({ onClose }: { onClose: () => void }) {
  const [networks, setCurrent] = useNetworks(
    useShallow((s) => [s.networks, s.setCurrent]),
  );

  return (
    <CommandGroup heading="Networks">
      {networks.map(({ dedup_chain_id, name, status }) => (
        <CommandItem
          key={name}
          keywords={["network", "switch", name]}
          onSelect={() => {
            setCurrent(name);
            onClose();
          }}
        >
          <ChainView
            chainId={dedup_chain_id.chain_id}
            name={name}
            status={status}
          />
        </CommandItem>
      ))}
    </CommandGroup>
  );
}

function WalletCommands({ onClose }: { onClose: () => void }) {
  const [allWalletInfo, setWallet, setAddress] = useWallets(
    useShallow((s) => [
      s.allWalletInfo,
      s.setCurrentWallet,
      s.setCurrentAddress,
    ]),
  );

  return (
    <CommandGroup heading="Wallets">
      {allWalletInfo?.flatMap(({ wallet, addresses }) =>
        addresses.flatMap(({ key, address, alias }) => (
          <CommandItem
            key={`${wallet.name} ${key}`}
            keywords={["switch", "wallet", wallet.name, address, alias].filter(
              (s) => !!s,
            )}
            onSelect={() => {
              setWallet(wallet.name);
              setAddress(key);
              onClose();
            }}
          >
            <div className="flex gap-2">
              <span>{wallet.name}</span>
              <ChevronRight size={2} />
              {alias && (
                <>
                  <span>{alias}</span>
                  <span className="text-muted-foreground">{address}</span>
                </>
              )}
              {!alias && <span>{address}</span>}
            </div>
          </CommandItem>
        )),
      )}
    </CommandGroup>
  );
}

function ThemeCommands({ onClose }: { onClose: () => void }) {
  const changeMode = useTheme((s) => s.changeMode);

  return (
    <CommandGroup heading="Theme">
      <CommandItem
        keywords={["theme", "switch", "light", "mode"]}
        onSelect={() => {
          changeMode("light");
          onClose();
        }}
      >
        Light theme
      </CommandItem>
      <CommandItem
        keywords={["theme", "switch", "dark", "mode"]}
        onSelect={() => {
          changeMode("dark");
          onClose();
        }}
      >
        Dark theme
      </CommandItem>
      <CommandItem
        keywords={["theme", "switch", "auto", "mode"]}
        onSelect={() => {
          changeMode("auto");
          onClose();
        }}
      >
        Auto theme
      </CommandItem>
    </CommandGroup>
  );
}
