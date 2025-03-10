import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronRight, Globe, RefreshCcw, Wallet } from "lucide-react";
import { useEffect } from "react";
import { useSettings } from "#/store/useSettings";
import { Progress } from "@ethui/ui/components/shadcn/progress";
import type { OnboardingStepKey } from "@ethui/types/settings";
import { invoke } from "@tauri-apps/api/core";

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
    link: { to: "/settings/general" },
  },
  {
    id: "wallet",
    title: "Set up a production-ready wallet",
    description: "Create or import a secure wallet",
    icon: <Wallet className="h-5 w-5" />,
    link: { to: "/settings/wallets" },
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
] as const;

function RouteComponent() {
  const onboarding = useSettings((s) => s.settings?.onboarding);

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
  const skipStep = (id: OnboardingStepKey) => {
    invoke("settings_onboarding_finish_step", { id });
  };

  return (
    <div
      key={id}
      className={clsx(
        "flex items-center justify-between p-4 transition-colors",
        completed
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
          : "bg-card",
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={clsx(
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
          <Button size="sm" className="cursor-pointer gap-1">
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
          <Button
            size="sm"
            variant="ghost"
            className="cursor-pointer gap-1"
            onClick={() => skipStep(id)}
          >
            Skip
          </Button>
        </div>
      )}
    </div>
  );
}
