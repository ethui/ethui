import { CommandGroup, CommandItem } from "@ethui/ui/components/shadcn/command";
import { useNavigate } from "@tanstack/react-router";
import { FileCode2, Network, Settings, Wallet } from "lucide-react";
import { useTheme } from "#/store/useTheme";
import { useUI } from "#/store/useUI";

interface QuickActionsProps {
  onClose: () => void;
}

type ThemeMode = "light" | "dark" | "auto";

interface NavigationAction {
  icon: React.ReactNode;
  label: string;
  keywords: string[];
  action: () => void;
}

interface ThemeAction {
  mode: ThemeMode;
  label: string;
  keywords: string[];
}

export function QuickActions({ onClose }: QuickActionsProps) {
  return (
    <CommandGroup heading="Quick Actions">
      <NavigationActions onClose={onClose} />
      <ThemeActions onClose={onClose} />
    </CommandGroup>
  );
}

function NavigationActions({ onClose }: QuickActionsProps) {
  const navigate = useNavigate();
  const { setWalletSidebar } = useUI();

  const actions: NavigationAction[] = [
    {
      icon: <FileCode2 className="mr-2 h-4 w-4" />,
      label: "Add Contract",
      keywords: ["add", "contract", "new"],
      action: () => navigate({ to: "/home/explorer/contracts/add" }),
    },
    {
      icon: <Wallet className="mr-2 h-4 w-4" />,
      label: "Add Wallet",
      keywords: ["add", "wallet", "new"],
      action: () => navigate({ to: "/home/settings/wallets" }),
    },
    {
      icon: <Network className="mr-2 h-4 w-4" />,
      label: "Add Network",
      keywords: ["add", "network", "new"],
      action: () => navigate({ to: "/home/settings/networks/new" }),
    },
    {
      icon: <Settings className="mr-2 h-4 w-4" />,
      label: "Change Wallet/Network",
      keywords: ["change", "switch", "wallet", "network", "settings"],
      action: () => setWalletSidebar(true),
    },
  ];

  return (
    <>
      {actions.map((action) => (
        <CommandItem
          className="cursor-pointer"
          key={action.label}
          keywords={action.keywords}
          onSelect={() => {
            action.action();
            onClose();
          }}
        >
          {action.icon}
          {action.label}
        </CommandItem>
      ))}
    </>
  );
}

function ThemeActions({ onClose }: QuickActionsProps) {
  const changeMode = useTheme((s) => s.changeMode);

  const themes: ThemeAction[] = [
    {
      mode: "light",
      label: "Light theme",
      keywords: ["theme", "switch", "light", "mode"],
    },
    {
      mode: "dark",
      label: "Dark theme",
      keywords: ["theme", "switch", "dark", "mode"],
    },
    {
      mode: "auto",
      label: "Auto theme",
      keywords: ["theme", "switch", "auto", "mode"],
    },
  ];

  return (
    <>
      {themes.map((theme) => (
        <CommandItem
          className="cursor-pointer"
          key={theme.mode}
          keywords={theme.keywords}
          onSelect={() => {
            changeMode(theme.mode);
            onClose();
          }}
        >
          {theme.label}
        </CommandItem>
      ))}
    </>
  );
}
