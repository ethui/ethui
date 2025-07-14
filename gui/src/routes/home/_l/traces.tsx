import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@ethui/ui/components/shadcn/card";
import { Input } from "@ethui/ui/components/shadcn/input";
import { Label } from "@ethui/ui/components/shadcn/label";
import { ScrollArea } from "@ethui/ui/components/shadcn/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ethui/ui/components/shadcn/select";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTraces, type TraceEvent } from "#/store/useTraces";

export const Route = createFileRoute("/home/_l/traces")({
  beforeLoad: () => ({ breadcrumb: "Traces" }),
  component: Traces,
});


function Traces() {
  const { traces, maxTraces, clearTraces, setMaxTraces } = useTraces();
  const [filterLevel, setFilterLevel] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState("");
  const [searchTerm, setSearchTerm] = useState("");


  const filteredTraces = traces.filter((trace) => {
    const levelMatch =
      filterLevel === "all" ||
      trace.level.toLowerCase() === filterLevel.toLowerCase();
    const targetMatch =
      filterTarget === "" ||
      trace.target.toLowerCase().includes(filterTarget.toLowerCase());
    const searchMatch =
      searchTerm === "" ||
      trace.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trace.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(trace.fields)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    return levelMatch && targetMatch && searchMatch;
  });

  const getLevelColor = (level: string): string => {
    switch (level.toLowerCase()) {
      case "error":
        return "bg-red-100 text-red-800 border-red-200";
      case "warn":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "info":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "debug":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "trace":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getLevelBg = (level: string): string => {
    switch (level.toLowerCase()) {
      case "error":
        return "bg-red-50";
      case "warn":
        return "bg-yellow-50";
      case "info":
        return "bg-blue-50";
      case "debug":
        return "bg-gray-50";
      case "trace":
        return "bg-purple-50";
      default:
        return "bg-gray-50";
    }
  };

  return (
    <div className="flex h-full flex-col p-4">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Trace Viewer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="min-w-64 flex-1">
              <Label htmlFor="search">Search traces</Label>
              <Input
                id="search"
                placeholder="Search in messages, targets, or fields..."
                value={searchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearchTerm(e.target.value)
                }
                className="mt-1"
              />
            </div>

            <div className="min-w-32">
              <Label htmlFor="level-filter">Level</Label>
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger id="level-filter" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                  <SelectItem value="warn">Warn</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                  <SelectItem value="trace">Trace</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-48">
              <Label htmlFor="target-filter">Target</Label>
              <Input
                id="target-filter"
                placeholder="Filter by target..."
                value={filterTarget}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilterTarget(e.target.value)
                }
                className="mt-1"
              />
            </div>

            <div className="min-w-24">
              <Label htmlFor="max-traces">Max</Label>
              <Select
                value={maxTraces.toString()}
                onValueChange={(val: string) => setMaxTraces(Number(val))}
              >
                <SelectTrigger id="max-traces" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                  <SelectItem value="1000">1000</SelectItem>
                  <SelectItem value="5000">5000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={clearTraces} variant="outline" size="sm">
              <Trash2 className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>

          <div className="mt-4 flex items-center gap-4">
            <div className="text-gray-600 text-sm">
              Showing {filteredTraces.length} of {traces.length} traces
            </div>
            <div className="flex gap-2">
              {["ERROR", "WARN", "INFO", "DEBUG", "TRACE"].map((level) => {
                const count = traces.filter((t) => t.level === level).length;
                return count > 0 ? (
                  <Badge
                    key={level}
                    variant="secondary"
                    className={getLevelColor(level)}
                  >
                    {level}: {count}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1">
        <CardContent className="p-0">
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="font-mono text-sm">
              {filteredTraces.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  {traces.length === 0
                    ? "No traces yet. Start the application to see traces."
                    : "No traces match your filters."}
                </div>
              ) : (
                filteredTraces.map((trace, index) => (
                  <div
                    key={index}
                    className={`border-b p-3 ${getLevelBg(trace.level)} hover:bg-gray-50`}
                  >
                    <div className="mb-1 flex items-center gap-3">
                      <span className="min-w-20 text-gray-500 text-xs">
                        {new Date(trace.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge
                        className={`text-xs ${getLevelColor(trace.level)}`}
                      >
                        {trace.level}
                      </Badge>
                      <span className="font-medium text-blue-600 text-xs">
                        {trace.target}
                      </span>
                    </div>

                    <div className="mb-2 ml-3 text-sm">{trace.message}</div>

                    {Object.keys(trace.fields).length > 0 && (
                      <div className="ml-3 text-xs">
                        <details className="group">
                          <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                            Fields ({Object.keys(trace.fields).length})
                          </summary>
                          <div className="mt-2 overflow-auto rounded bg-gray-100 p-2 text-xs">
                            <pre>{JSON.stringify(trace.fields, null, 2)}</pre>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
