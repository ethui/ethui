import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AutoSubmitTextInput } from "@ethui/ui/components/form/auto-submit/text-input";
import { Button } from "@ethui/ui/components/shadcn/button";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import { cn } from "@ethui/ui/lib/utils";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { RefreshCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useInvoke } from "#/hooks/useInvoke";
import { useSettings } from "#/store/useSettings";
const LOG_WINDOW = 64_000;
export const Route = createFileRoute("/home/_l/settings/_l/logging")({
    beforeLoad: () => ({ breadcrumb: "Logging" }),
    component: SettingsLogging,
});
const ANSI_PATTERN = /\u001B\[[0-9;]*m/;
const ANSI_SPLIT = /\u001B\[[0-9;]*m/g;
const DEFAULT_CLASS = "text-foreground/80";
const ANSI_COLOR_CLASSES = {
    30: "text-slate-500",
    31: "text-red-500",
    32: "text-emerald-500",
    33: "text-yellow-500",
    34: "text-sky-500",
    35: "text-fuchsia-500",
    36: "text-cyan-500",
    37: DEFAULT_CLASS,
    90: "text-slate-400",
    91: "text-red-400",
    92: "text-emerald-400",
    93: "text-yellow-400",
    94: "text-sky-400",
    95: "text-fuchsia-400",
    96: "text-cyan-400",
    97: "text-zinc-200",
};
function SettingsLogging() {
    const settings = useSettings((s) => s.settings);
    const [filter, setFilter] = useState("");
    const debouncedFilter = useDebouncedValue(filter, 300);
    const logArgs = useMemo(() => ({ limit: LOG_WINDOW }), []);
    const { data: snapshot, isLoading: isLogLoading, isFetching: isLogFetching, refetch, } = useInvoke("logging_get_snapshot", logArgs, {
        refetchInterval: 2000,
        refetchIntervalInBackground: true,
    });
    const rawContent = snapshot?.content ?? (isLogLoading ? "Loading…" : "No log data yet.");
    const logLines = useMemo(() => rawContent.split(/\r?\n/), [rawContent]);
    const filteredLines = useMemo(() => {
        if (!debouncedFilter.trim())
            return logLines;
        const term = debouncedFilter.toLowerCase();
        return logLines.filter((line) => line.toLowerCase().includes(term));
    }, [logLines, debouncedFilter]);
    const parsedLines = useMemo(() => filteredLines.map(parseAnsiLine), [filteredLines]);
    const logPath = snapshot?.path ?? "Waiting for log file to be created…";
    const truncatedNotice = snapshot?.truncated
        ? `Showing the last ${(LOG_WINDOW / 1024).toFixed(0)} KB of the log. Open the file above to view the full contents.`
        : null;
    return (_jsx(ScrollArea, { className: "flex flex-1 min-h-0 max-w-full", children: _jsxs("div", { className: "flex flex-1 min-h-0 flex-col gap-6 pr-4", children: [_jsx("div", { className: "max-w-sm", children: _jsx(AutoSubmitTextInput, { name: "rustLog", label: "Rust log level", successLabel: "Saved", value: settings?.rustLog ?? "", callback: async (rustLog) => await invoke("settings_set", { params: { rustLog } }) }) }), _jsxs("section", { className: "flex w-full flex-1 flex-col gap-2 min-h-0", children: [_jsx("div", { className: "flex w-full flex-wrap items-center gap-3", children: _jsxs("div", { className: "flex min-w-0 flex-1 flex-col gap-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-sm font-medium", children: "Current session log" }), _jsx(Button, { size: "icon", variant: "ghost", onClick: () => void refetch(), disabled: isLogFetching, className: "h-7 w-7", children: _jsx(RefreshCcw, { className: cn("h-4 w-4", isLogFetching && "animate-spin") }) })] }), _jsx("p", { className: "text-xs text-muted-foreground break-all", children: logPath }), _jsxs("div", { className: "relative w-full max-w-xs", children: [_jsx("label", { className: "sr-only", htmlFor: "log-filter", children: "Filter log output" }), _jsx("input", { id: "log-filter", className: "w-full rounded border bg-background px-8 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary", placeholder: "Filter log lines\u2026", value: filter, onChange: (event) => setFilter(event.target.value) }), _jsx(Search, { className: "pointer-events-none absolute left-2 top-1.5 h-4 w-4 text-muted-foreground" })] })] }) }), _jsx("div", { className: "flex-1 min-h-0 w-full overflow-hidden rounded border bg-muted/40", children: _jsx(ScrollArea, { className: "h-full max-h-full w-full", children: _jsx("div", { className: "flex min-h-full flex-col gap-1 p-3 font-mono text-sm", children: parsedLines.map((segments, idx) => (_jsx("div", { className: "whitespace-pre-wrap break-words text-foreground/80", children: segments.length === 0
                                            ? "\u00A0"
                                            : segments.map((segment, segmentIdx) => (_jsx("span", { className: cn(segment.className), children: segment.text }, segmentIdx))) }, idx))) }) }) }), truncatedNotice ? (_jsx("p", { className: "text-xs text-muted-foreground", children: truncatedNotice })) : null] })] }) }));
}
function parseAnsiLine(line) {
    const parts = line.split(ANSI_SPLIT);
    const codes = line.match(ANSI_SPLIT) ?? [];
    const segments = [];
    let currentClass = DEFAULT_CLASS;
    for (let i = 0; i < parts.length; i++) {
        const text = parts[i];
        if (text.length > 0) {
            segments.push({ text, className: currentClass });
        }
        const code = codes[i];
        if (code) {
            currentClass = applySgr(code, currentClass);
        }
    }
    return segments;
}
function applySgr(code, currentClass) {
    if (!ANSI_PATTERN.test(code)) {
        return currentClass;
    }
    const content = code.slice(2, -1);
    const values = content
        .split(";")
        .map(Number)
        .filter((v) => !Number.isNaN(v));
    if (values.length === 0) {
        return DEFAULT_CLASS;
    }
    let nextClass = currentClass;
    for (const value of values) {
        if (value === 0 || value === 39) {
            nextClass = DEFAULT_CLASS;
        }
        const mapped = ANSI_COLOR_CLASSES[value];
        if (mapped) {
            nextClass = mapped;
        }
    }
    return nextClass;
}
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
