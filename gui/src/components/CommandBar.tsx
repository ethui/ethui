import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
} from "@mui/material";
import {
  ActionImpl,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";
import React, { ReactNode, forwardRef } from "react";

function RenderResults() {
  const { results } = useMatches();

  return (
    <List
      component={KBarResults}
      items={results}
      onRender={({ item, active }) =>
        typeof item === "string" ? (
          <div
            style={{
              padding: "8px 16px",
              fontSize: "10px",
              textTransform: "uppercase" as const,
              opacity: 0.5,
            }}
          >
            {item}
          </div>
        ) : (
          <ResultItem action={item} active={active} />
        )
      }
    />
  );
}

const ResultItem = forwardRef(
  (
    {
      action,
      active,
    }: {
      action: ActionImpl;
      active: boolean;
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    return (
      <ListItemButton ref={ref} selected={active}>
        {action.icon && <ListItemIcon>{action.icon}</ListItemIcon>}

        <ListItemText primary={action.name} secondary={action.subtitle} />

        {action.shortcut?.length ? (
          <ListItemSecondaryAction aria-hidden>
            {action.shortcut.map((sc) => (
              <kbd key={sc}>{sc}</kbd>
            ))}
          </ListItemSecondaryAction>
        ) : null}
      </ListItemButton>
    );
  }
);

ResultItem.displayName = "ResultItem";

export function CommandBar({ children }: { children: ReactNode }) {
  return (
    <>
      <KBarPortal>
        <KBarPositioner>
          <Paper
            component={KBarAnimator}
            elevation={3}
            style={{
              maxWidth: "600px",
              width: "100%",
              // background: "var(--background)",
              // color: "var(--foreground)",
              // borderRadius: "8px",
              overflow: "hidden",
              // boxShadow: "var(--shadow)",
            }}
          >
            <KBarSearch
              style={{
                padding: "12px 16px",
                fontSize: "16px",
                width: "100%",
                boxSizing: "border-box" as React.CSSProperties["boxSizing"],
                outline: "none",
                border: "none",
                background: "var(--background)",
                color: "var(--foreground)",
              }}
            />
            <RenderResults />
          </Paper>
        </KBarPositioner>
      </KBarPortal>
      {children}
    </>
  );
}

export function CommandBarProvider({ children }: { children: ReactNode }) {
  return <KBarProvider>{children}</KBarProvider>;
}
