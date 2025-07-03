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
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle, FileText, RefreshCw, XCircle, Zap } from "lucide-react";
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
        <h4 className="font-medium">Trace Data</h4>
        <Card>
          <CardContent className="p-4">
            <pre className="max-w-full overflow-hidden text-ellipsis whitespace-pre-wrap rounded bg-muted p-2 text-xs">
              {JSON.stringify(trace.trace_data, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
