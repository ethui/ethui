import {
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
} from "@mui/material";
import {
  ActionId,
  ActionImpl,
  KBarAnimator,
  KBarPortal,
  KBarPositioner,
  KBarProvider,
  KBarResults,
  KBarSearch,
  useMatches,
} from "kbar";
import React from "react";

function RenderResults() {
  const { results, rootActionId } = useMatches();

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
          <ResultItem
            action={item}
            active={active}
            currentRootActionId={rootActionId}
          />
        )
      }
    />
  );
}

const ResultItem = React.forwardRef(
  (
    {
      action,
      active,
      currentRootActionId,
    }: {
      action: ActionImpl;
      active: boolean;
      currentRootActionId?: ActionId;
    },
    ref: React.Ref<HTMLDivElement>
  ) => {
    const ancestors = React.useMemo(() => {
      if (!currentRootActionId) return action.ancestors;
      const index = action.ancestors.findIndex(
        (ancestor) => ancestor.id === currentRootActionId
      );
      // +1 removes the currentRootAction; e.g.
      // if we are on the "Set theme" parent action,
      // the UI should not display "Set theme… > Dark"
      // but rather just "Dark"
      return action.ancestors.slice(index + 1);
    }, [action.ancestors, currentRootActionId]);

    return (
      <ListItem
        ref={ref}
        selected={active}
        secondaryAction={
          action.shortcut?.length ? (
            <div aria-hidden>
              {action.shortcut.map((sc) => (
                <kbd key={sc}>{sc}</kbd>
              ))}
            </div>
          ) : null
        }
      >
        {action.icon && <ListItemAvatar>{action.icon}</ListItemAvatar>}
        <ListItemText primary={action.name} secondary={action.subtitle} />
      </ListItem>
    );
  }
);

const actions = [
  {
    id: "blog",
    name: "Blog",
    subtitle: "asd",
    shortcut: ["b"],
    keywords: "writing words",
    perform: () => (window.location.pathname = "details"),
  },
  {
    id: "contact",
    name: "Contact",
    shortcut: ["c"],
    keywords: "email",
    perform: () => (window.location.pathname = "transactions"),
  },
];

export function CommandBar({ children }: { children: ReactNode }) {
  return (
    <KBarProvider actions={actions}>
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
    </KBarProvider>
  );
}
