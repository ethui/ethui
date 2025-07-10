import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { Badge } from "@ethui/ui/components/shadcn/badge";
import { Button } from "@ethui/ui/components/shadcn/button";
import { Card, CardContent } from "@ethui/ui/components/shadcn/card";
import { createFileRoute } from "@tanstack/react-router";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Play,
  RefreshCw,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Datapoint } from "#/components/Datapoint";

export const Route = createFileRoute("/home/_l/forge-traces")({
  beforeLoad: () => ({ breadcrumb: "Forge Traces" }),
  component: ForgeTraces,
});

interface ForgeTrace {
  test_name: string;
  contract_name: string;
  trace_data: any;
  gas_used?: number;
  success: boolean;
}

interface TraceNode {
  parent: number | null;
  children: number[];
  idx: number;
  traceType?: string; // "Deployment", "Setup", "Execution"
  trace: {
    depth: number;
    success: boolean;
    caller: string;
    address: string;
    kind: string;
    value: string;
    data: string;
    output: string;
    gas_used: number;
    gas_limit: number;
    status: string;
    logs: any[];
    steps?: any[];
    _traceType?: string; // Internal trace type for display
  };
}

interface ParsedTraceData {
  arena: TraceNode[];
}

function ForgeTraces() {
  const [traces, setTraces] = useState<ForgeTrace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const unlistenFn = await listen<{
          ForgeTestTracesUpdated: ForgeTrace[];
        }>("forge-test-traces-updated", (event) => {
          console.log("Received forge traces:", event.payload);
          if (event.payload.ForgeTestTracesUpdated) {
            setTraces(event.payload.ForgeTestTracesUpdated);
          }
        });
        unlisten = unlistenFn;
      } catch (error) {
        console.error("Failed to setup forge traces listener:", error);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        try {
          unlisten();
        } catch (error) {
          console.error("Failed to cleanup forge traces listener:", error);
        }
      }
    };
  }, []);

  const refreshTraces = () => {
    setLoading(true);
    // This would typically trigger a refresh from the backend
    // For now, we'll just reset the loading state
    setTimeout(() => setLoading(false), 500);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-bold text-2xl">Forge Test Traces</h1>
        <Button
          onClick={refreshTraces}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {traces.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium text-lg">No forge traces yet</p>
            <p className="text-muted-foreground text-sm">
              Run forge tests using the ethui cli to see traces appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {traces.length} trace{traces.length !== 1 ? "s" : ""}
            </Badge>
            <Badge variant="outline">
              {traces.filter((t) => t.success).length} passed
            </Badge>
            <Badge variant="outline">
              {traces.filter((t) => !t.success).length} failed
            </Badge>
          </div>

          <Accordion type="multiple" className="w-full">
            <AnimatePresence>
              {traces.map((trace, index) => (
                <AccordionItem
                  asChild
                  key={`${trace.contract_name}-${trace.test_name}-${index}`}
                  value={`${trace.contract_name}-${trace.test_name}-${index}`}
                >
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{
                      height: { duration: 0.4 },
                      opacity: { duration: 0.3 },
                    }}
                  >
                    <AccordionTrigger>
                      <TraceSummary trace={trace} />
                    </AccordionTrigger>
                    <AccordionContent>
                      <TraceDetails trace={trace} />
                    </AccordionContent>
                  </motion.div>
                </AccordionItem>
              ))}
            </AnimatePresence>
          </Accordion>
        </div>
      )}
    </div>
  );
}

interface TraceSummaryProps {
  trace: ForgeTrace;
}

function TraceSummary({ trace }: TraceSummaryProps) {
  return (
    <div className="flex w-full items-center gap-x-3">
      <div className="flex items-center gap-2">
        {trace.success ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <XCircle className="h-5 w-5 text-red-500" />
        )}
        <Badge variant={trace.success ? "default" : "destructive"}>
          {trace.success ? "PASS" : "FAIL"}
        </Badge>
      </div>

      <div className="flex flex-col items-start gap-1">
        <span className="font-medium">{trace.test_name}</span>
        <span className="text-muted-foreground text-sm">
          {trace.contract_name}
        </span>
      </div>

      {trace.gas_used && (
        <div className="ml-auto flex items-center gap-1">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="font-mono text-sm">
            {trace.gas_used.toLocaleString()} gas
          </span>
        </div>
      )}
    </div>
  );
}

interface TraceDetailsProps {
  trace: ForgeTrace;
}

function TraceDetails({ trace }: TraceDetailsProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Datapoint label="Test Name" value={trace.test_name} />
        <Datapoint label="Contract" value={trace.contract_name} />
        <Datapoint
          label="Status"
          value={
            <Badge variant={trace.success ? "default" : "destructive"}>
              {trace.success ? "PASSED" : "FAILED"}
            </Badge>
          }
        />
        {trace.gas_used && (
          <Datapoint
            label="Gas Used"
            value={
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="font-mono">
                  {trace.gas_used.toLocaleString()}
                </span>
              </div>
            }
          />
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Execution Trace</h4>
        <Card>
          <CardContent className="p-4">
            <TraceTreeView traceData={trace.trace_data} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Tree View Components
interface TraceTreeViewProps {
  traceData: any;
}

function TraceTreeView({ traceData }: TraceTreeViewProps) {
  const parsedTrace = parseTraceData(traceData);

  if (!parsedTrace || !parsedTrace.arena || parsedTrace.arena.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground text-sm">
        No trace data available
      </div>
    );
  }

  // Find root nodes (nodes with no parent)
  const rootNodes = parsedTrace.arena.filter((node) => node.parent === null);

  // Group root nodes by trace type for better organization
  const groupedRoots = rootNodes.reduce(
    (acc, node) => {
      const traceType = node.trace._traceType || "Unknown";
      if (!acc[traceType]) acc[traceType] = [];
      acc[traceType].push(node);
      return acc;
    },
    {} as Record<string, TraceNode[]>,
  );

  // Define order for trace types
  const traceTypeOrder = ["Deployment", "Setup", "Execution"];
  const orderedTraceTypes = traceTypeOrder.filter((type) => groupedRoots[type]);

  // Add any other trace types not in the predefined order
  Object.keys(groupedRoots).forEach((type) => {
    if (!traceTypeOrder.includes(type)) {
      orderedTraceTypes.push(type);
    }
  });

  return (
    <div className="space-y-3">
      {orderedTraceTypes.length > 1 ? (
        // Show grouped by trace type when multiple types exist
        orderedTraceTypes.map((traceType) => (
          <div key={traceType} className="space-y-1">
            <h5 className="border-b pb-1 font-medium text-muted-foreground text-sm">
              {traceType} Phase
            </h5>
            <div className="space-y-1">
              {groupedRoots[traceType].map((node) => (
                <TraceTreeNode
                  key={node.idx}
                  node={node}
                  arena={parsedTrace.arena}
                  depth={0}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        // Show flat structure when only one trace type
        <div className="space-y-1">
          {rootNodes.map((node) => (
            <TraceTreeNode
              key={node.idx}
              node={node}
              arena={parsedTrace.arena}
              depth={0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TraceTreeNodeProps {
  node: TraceNode;
  arena: TraceNode[];
  depth: number;
}

function TraceTreeNode({ node, arena, depth }: TraceTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth < 2); // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;

  // Call forge ABI fetch for CREATE operations when component mounts
  useEffect(() => {
    if (node.trace.kind.toUpperCase() === "CREATE" && node.trace.output) {
      const fetchForgeAbi = async () => {
        try {
          const result = await invoke("get_abi_for_code", { bytecode: node.trace.output });
          console.log("Forge ABI result for CREATE operation:", result);
        } catch (error) {
          console.error("Error fetching forge ABI:", error);
        }
      };
      fetchForgeAbi();
    }
  }, [node.trace.kind, node.trace.output]);

  const getKindIcon = (kind: string) => {
    switch (kind.toUpperCase()) {
      case "CREATE":
      case "CREATE2":
        return <Box className="h-4 w-4 text-blue-500" />;
      case "CALL":
        return <Play className="h-4 w-4 text-green-500" />;
      case "STATICCALL":
        return <Code className="h-4 w-4 text-purple-500" />;
      case "DELEGATECALL":
        return <ArrowRight className="h-4 w-4 text-orange-500" />;
      default:
        return <Play className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatAddress = (address: string) => {
    if (!address || address === "0x") return "0x";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatValue = (value: string) => {
    if (!value || value === "0x0" || value === "0x") return "";
    // Convert hex to decimal and format as ETH
    try {
      const bigIntValue = BigInt(value);
      if (bigIntValue === 0n) return "";
      const ethValue = Number(bigIntValue) / 1e18;
      return ethValue > 0 ? ` (${ethValue.toFixed(6)} ETH)` : "";
    } catch {
      return "";
    }
  };

  const getFunctionSignature = (data: string) => {
    if (!data || data === "0x" || data.length < 10) return "";
    return data.slice(0, 10); // First 4 bytes (8 hex chars + 0x)
  };

  const getStatusColor = (success: boolean) => {
    return success ? "text-green-600" : "text-red-600";
  };

  return (
    <div>
      <div className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted/50">
        {/* Indentation */}
        <div
          style={{ marginLeft: `${depth * 20}px` }}
          className="flex items-center gap-1"
        >
          {/* Expand/Collapse Button */}
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex h-4 w-4 items-center justify-center rounded hover:bg-muted"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="h-4 w-4" />
          )}

          {/* Kind Icon */}
          {getKindIcon(node.trace.kind)}
        </div>

        {/* Trace Information */}
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {/* Show trace type badge for context */}
          {node.trace._traceType && (
            <span
              className={`rounded px-1 font-medium text-xs ${
                node.trace._traceType === "Setup"
                  ? "bg-yellow-100 text-yellow-800"
                  : node.trace._traceType === "Deployment"
                    ? "bg-blue-100 text-blue-800"
                    : "bg-green-100 text-green-800"
              }`}
            >
              {node.trace._traceType}
            </span>
          )}

          <span className="font-medium font-mono text-sm">
            {node.trace.kind}
          </span>

          {node.trace.kind.toUpperCase() !== "CREATE" && (
            <>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono text-sm">
                {formatAddress(node.trace.address)}
              </span>
            </>
          )}

          {getFunctionSignature(node.trace.data) && (
            <span className="rounded bg-muted px-1 font-mono text-muted-foreground text-xs">
              {getFunctionSignature(node.trace.data)}
            </span>
          )}

          {formatValue(node.trace.value) && (
            <span className="text-blue-600 text-sm">
              {formatValue(node.trace.value)}
            </span>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span className="text-muted-foreground text-xs">
              {node.trace.gas_used.toLocaleString()} gas
            </span>
            <span
              className={`font-medium text-xs ${getStatusColor(node.trace.success)}`}
            >
              {node.trace.success ? "✓" : "✗"}
            </span>
          </div>
        </div>
      </div>

      {/* Render Children */}
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((childIdx) => {
            const childNode = arena.find((n) => n.idx === childIdx);
            if (!childNode) return null;
            return (
              <TraceTreeNode
                key={childIdx}
                node={childNode}
                arena={arena}
                depth={depth + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper function to parse trace data
function parseTraceData(traceData: any): ParsedTraceData | null {
  try {
    // Handle different possible trace data formats
    if (Array.isArray(traceData) && traceData.length > 0) {
      // Combine arenas from all trace types: [["Execution", { arena: [...] }], ["Deployment", { arena: [...] }], ["Setup", { arena: [...] }]]
      const combinedArena: TraceNode[] = [];
      let nodeIdOffset = 0;

      for (const item of traceData) {
        if (
          Array.isArray(item) &&
          item.length >= 2 &&
          item[1] &&
          item[1].arena
        ) {
          const traceType = item[0]; // "Deployment", "Setup", "Execution"
          const arena = item[1].arena;

          // Add trace type context to each node and adjust indices
          const adjustedArena = arena.map((node: any) => ({
            ...node,
            idx: node.idx + nodeIdOffset,
            parent: node.parent !== null ? node.parent + nodeIdOffset : null,
            children: node.children.map(
              (childIdx: number) => childIdx + nodeIdOffset,
            ),
            traceType, // Add trace type for context
            trace: {
              ...node.trace,
              // Add trace type to help with display
              _traceType: traceType,
            },
          }));

          combinedArena.push(...adjustedArena);
          nodeIdOffset += arena.length;
        }
      }

      if (combinedArena.length > 0) {
        return { arena: combinedArena };
      }

      // Fallback: try to find any single trace type
      for (const traceType of ["Deployment", "Setup", "Execution"]) {
        const foundTrace = traceData.find(
          (item) => Array.isArray(item) && item[0] === traceType,
        );
        if (foundTrace && foundTrace[1] && foundTrace[1].arena) {
          return { arena: foundTrace[1].arena };
        }
      }
    }

    // Direct arena format
    if (traceData && traceData.arena) {
      return { arena: traceData.arena };
    }

    return null;
  } catch (error) {
    console.error("Error parsing trace data:", error);
    return null;
  }
}
