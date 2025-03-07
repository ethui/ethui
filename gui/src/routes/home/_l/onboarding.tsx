import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute, redirect } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronRight, Globe, RefreshCcw, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSettings } from "#/store/useSettings";
import { Progress } from "@ethui/ui/components/shadcn/progress";

export const Route = createFileRoute("/home/_l/onboarding")({
  beforeLoad: () => ({ breadcrumb: "Onboarding" }),
  component: RouteComponent,
});

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps = [
  {
    id: "alchemy",
    title: "Set up an alchemy.com API Key",
    description: "Enables fast sync on mainnet and other live chains",
    icon: <RefreshCcw className="h-5 w-5" />,
  },
  {
    id: "wallet",
    title: "Set up a production-ready wallet",
    description: "Create or import a secure wallet",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    id: "extension",
    title: "Connect the ethui extension",
    description: "To connect ethui to your browser(s)",
    icon: <Globe className="h-5 w-5" />,
  },
] as const;

function RouteComponent() {
  const onboarding = useSettings((s) => s.settings?.onboarding);
  console.log(onboarding);

  useEffect(() => {
    if (onboarding?.hidden) {
      redirect({ to: "/home/account" });
    }
  }, [onboarding?.hidden]);

  if (!onboarding) {
    return null;
  }

  const complete = steps.filter(({ id }) => onboarding[id]);
  const incomplete = steps.filter(({ id }) => !onboarding[id]);
  const progress = (complete.length / steps.length) * 100;

  console.log(onboarding);
  return (
    <div className="flex flex-col">
      <Progress value={progress} className="h-2 w-full" />
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
}: OnboardingStep & { completed: boolean }) {
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
        {" "}
        <div
          className={clsx(
            "p-2",
            completed &&
            "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
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
        <Button
          variant="secondary"
          size="sm"
          className="cursor-pointer gap-1"
          onClick={() => { }}
        >
          {completed ? (
            <>
              <Check className="h-4 w-4" /> <span>Completed</span>
            </>
          ) : (
            <>
              <span>Start</span> <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      )}
    </div>
  );
}
