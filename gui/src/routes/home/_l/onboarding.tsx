import { Button } from "@ethui/ui/components/shadcn/button";
import { createFileRoute } from "@tanstack/react-router";
import clsx from "clsx";
import { Check, ChevronRight, Globe, RefreshCcw, Wallet } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/home/_l/onboarding")({
  beforeLoad: () => ({
    breadcrumb: "Onboarding",
  }),
  component: RouteComponent,
});

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

const steps = [
  {
    id: "alchemy",
    title: "Set up an alchemy.com API Key",
    description: "Enables fast sync on mainnet and other live chains",
    icon: <RefreshCcw className="h-5 w-5" />,
    completed: false,
  },
  {
    id: "wallet",
    title: "Set up a production-ready wallet",
    description: "Create or import a secure wallet",
    icon: <Wallet className="h-5 w-5" />,
    completed: false,
  },
  {
    id: "extension",
    title: "Connect the ethui extension",
    description: "To connect ethui to your browser(s)",
    icon: <Globe className="h-5 w-5" />,
    completed: false,
  },
];

function RouteComponent() {
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "alchemy",
      title: "alchemy.com",
      description: "Enables fast sync on mainnet and other live chains",
      icon: <RefreshCcw className="h-5 w-5" />,
      completed: false,
    },
    {
      id: "wallet",
      title: "Production-ready wallet",
      description: "Create or import a secure wallet",
      icon: <Wallet className="h-5 w-5" />,
      completed: false,
    },
    {
      id: "extension",
      title: "Connect ethui extension",
      description: "To connect ethui to your browser(s)",
      icon: <Globe className="h-5 w-5" />,
      completed: false,
    },
  ]);

  const [showCompleted, setShowCompleted] = useState(true);

  const toggleStep = (id: string) => {
    setSteps(
      steps.map((step) =>
        step.id === id ? { ...step, completed: !step.completed } : step,
      ),
    );
  };

  const completedSteps = steps.filter((step) => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  const filteredSteps = showCompleted
    ? steps
    : steps.filter((step) => !step.completed);

  return (
    <div className="m-1 flex flex-col">
      {filteredSteps.map((step) => (
        <div
          key={step.id}
          className={clsx(
            "flex items-center justify-between p-4 transition-colors",
            step.completed
              ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30"
              : "bg-card",
          )}
        >
          <div className="flex items-center gap-4">
            <div
              className={clsx(
                "p-2",
                step.completed &&
                "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400",
              )}
            >
              {step.icon}
            </div>
            <div>
              <h3 className="font-medium">{step.title}</h3>
              <p className="text-muted-foreground text-sm">
                {step.description}
              </p>
            </div>
          </div>
          <Button
            variant={step.completed ? "outline" : "secondary"}
            size="sm"
            className="cursor-pointer gap-1"
            onClick={() => toggleStep(step.id)}
          >
            {step.completed ? (
              <>
                <Check className="h-4 w-4" />
                <span>Completed</span>
              </>
            ) : (
              <>
                <span>Start</span>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      ))}
    </div>
  );
}
