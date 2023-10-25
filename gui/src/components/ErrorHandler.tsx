import { Typography } from "@mui/material";
import { invoke } from "@tauri-apps/api";
import { ErrorInfo, ReactNode } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { MonoText } from "./MonoText";
import { Panel } from "./Panel";

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
    <Panel>
      <Typography>Something went wrong:</Typography>
      <MonoText>
        {error.toString()}
        <br />
        <br />
        {formatStack(error.stack).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </MonoText>
    </Panel>
  );
}

function logWindowError(event: string | Event, error: Error | undefined) {
  const message = error ? error : event;
  const stack = error?.stack?.split("\n").filter((n) => n.length > 0);
  invoke("ui_error", { message, stack });
}

function logUnhandledRejection(reason: Error | string) {
  const message = typeof reason === "string" ? reason : reason.message;
  const stack = typeof reason === "string" ? [] : formatStack(reason?.stack);
  invoke("ui_error", { message, stack });
}

async function logError(err: Error, info?: ErrorInfo) {
  await invoke("ui_error", {
    message: err?.message || err,
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
