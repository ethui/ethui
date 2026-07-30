import { Alert, AlertDescription } from "@ethui/ui/components/shadcn/alert";
import { invoke } from "@tauri-apps/api/core";
import { AlertCircle } from "lucide-react";
import type { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface Props {
  children: ReactNode;
}

window.onerror = (event, _source, _line, _col, error) => {
  logWindowError(event, error);
};
window.onunhandledrejection = (event) => logUnhandledRejection(event.reason);

export function ErrorHandler({ children }: Props) {
  return (
    <ErrorBoundary FallbackComponent={Fallback} onError={logError}>
      {children}
    </ErrorBoundary>
  );
}

function Fallback({ error }: { error: Error }) {
  return (
    <>
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Something went wrong</AlertDescription>
      </Alert>
      <span className="font-mono">
        {error.toString()}
        <br />
        <br />
        {formatStack(error.stack).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </span>
    </>
  );
}

function logWindowError(event: string | Event, error: Error | undefined) {
  const message = error ? error.toString() : event.toString();
  const stack = error?.stack?.split("\n").filter((n) => n.length > 0);
  console.error(error);
  invoke("ui_error", { message, stack }).catch((err) =>
    console.warn("Failed to report UI error", err),
  );
}

function logUnhandledRejection(reason: Error | string) {
  const message = typeof reason === "string" ? reason : reason.message;
  const stack = typeof reason === "string" ? [] : formatStack(reason?.stack);
  // console.error(reason);
  invoke("ui_error", { message, stack }).catch((err) =>
    console.warn("Failed to report UI rejection", err),
  );
}

async function logError(err: Error, info?: ErrorInfo) {
  console.error(err, info);
  await invoke("ui_error", {
    message: err?.message?.toString() || err.toString(),
    stack: formatStack(info?.componentStack),
  });
}

function formatStack(stack?: string | null): string[] {
  return (stack || "")
    .split("\n")
    .filter((l) => l.length > 0)
    .filter((l) => !l.includes(".vite"))
    .filter((l) => !l.includes("react"))
    .map((l) => l.replace(/http:\/\/[^/]*/, ""));
}
