import type { OnboardingStepKey } from "@ethui/types/settings";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Progress } from "@ethui/ui/components/shadcn/progress";
import { cn } from "@ethui/ui/lib/utils";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  ChevronRight,
  FileCode2,
  Globe,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "#/store/useSettings";
import { useWallets } from "#/store/useWallets";

export const Route = createFileRoute("/home/_l/onboarding")({
  beforeLoad: () => ({ breadcrumb: "Onboarding" }),
  component: RouteComponent,
});

interface OnboardingStep {
  id: OnboardingStepKey;
  title: string;
  description: string;
  icon: React.ReactNode;
  link?: Omit<React.ComponentProps<typeof Link>, "children" | "className">;
}

const steps = [
  {
    id: "alchemy",
    title: "Set up an alchemy.com API Key",
    description: "Enables fast sync on mainnet and other live chains",
    icon: <RefreshCcw className="h-5 w-5" />,
    link: { to: "/home/settings/general" },
  },
  {
    id: "etherscan",
    title: "Set up an etherscan.io API Key",
    description: "Enables ABI fetching from verified contracts",
    icon: <RefreshCcw className="h-5 w-5" />,
    link: { to: "/home/settings/general" },
  },
  {
    id: "wallet",
    title: "Set up a production-ready wallet",
    description: "Create or import a secure wallet",
    icon: <Wallet className="h-5 w-5" />,
    link: { to: "/home/settings/wallets" },
  },
  {
    id: "extension",
    title: "Connect the ethui extension",
    description: "To connect ethui to your browser(s)",
    icon: <Globe className="h-5 w-5" />,
    link: {
      to: "https://ethui.dev/onboarding/extension",
      target: "_blank",
      rel: "noopener noreferrer",
    },
  },
  {
    id: "foundry",
    title: "Add foundry ABI paths",
    description:
      "To automatically sync contracts with ABIs for foundry projects",
    icon: <FileCode2 className="h-5 w-5" />,
    link: {
      to: "/home/settings/foundry",
    },
  },
] as const;

function RouteComponent() {
  const onboarding = useSettings((s) => s.settings?.onboarding);
  useAutofill();

  useEffect(() => {
    if (onboarding?.hidden) {
      redirect({ to: "/home/account" });
    }
  }, [onboarding?.hidden]);

  if (!onboarding) {
    return null;
  }

  const complete = steps.filter(({ id }) => onboarding.steps[id]);
  const incomplete = steps.filter(({ id }) => !onboarding.steps[id]);
  const progress = (complete.length / steps.length) * 100;

  const skipAll = () => {
    invoke("settings_onboarding_finish_all");
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-4 p-2">
        <Progress value={progress} className="h-2 w-full" />
        <Button onClick={skipAll} className="cursor-pointer">
          Skip all
        </Button>
      </div>
      {incomplete.map((step) => (
        <Step key={step.id} {...step} completed={false} />
      ))}
      {complete.map((step) => (
        <Step key={step.id} {...step} completed={true} />
      ))}
    </div>
  );
}

function Step({
  id,
  description,
  title,
  icon,
  completed,
  link,
}: OnboardingStep & { completed: boolean }) {
  return (
    <div
      key={id}
      className={cn(
        "flex items-center justify-between p-4 transition-colors",
        completed
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "bg-card",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "p-2",
            completed && "text-green-700 dark:text-green-400",
          )}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-medium">{title}</h3>{" "}
          <p className="text-muted-foreground text-sm"> {description} </p>
        </div>
      </div>
      {completed && <Check className="h-4 w-4" />}
      {!completed && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer gap-1"
            onClick={() => skipStep(id)}
          >
            Skip
          </Button>
          <Button size="sm" className="cursor-pointer gap-1" variant="ghost">
            {completed && (
              <>
                <Check className="h-4 w-4" /> <span>Completed</span>
              </>
            )}
            {!completed && link && (
              <Link {...link} className="flex items-center gap-1">
                <span>Start</span> <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

function useAutofill() {
  const settings = useSettings((s) => s.settings);
  const wallets = useWallets((s) => s.wallets);

  // Autofill onboarding steps when first entering the page
  useEffect(() => {
    if (!settings?.onboarding.steps.wallet && wallets.length > 1) {
      skipStep("wallet");
    }

    if (
      !settings?.onboarding.steps.alchemy &&
      (settings?.alchemyApiKey ?? "").length > 0
    ) {
      skipStep("alchemy");
    }

    if (
      !settings?.onboarding.steps.foundry &&
      (settings?.abiWatchPath ?? "").length > 0
    ) {
      skipStep("foundry");
    }
  });
}

function skipStep(id: OnboardingStepKey) {
  invoke("settings_onboarding_finish_step", { id });
}
