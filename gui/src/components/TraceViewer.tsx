import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ethui/ui/components/shadcn/collapsible";
import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { cn } from "@ethui/ui/lib/utils";
import type { TreeNode } from "../lib/convertForgeTestTrace";

interface TreeNodeProps {
  node: TreeNode;
  level: number;
  className?: string;
  labels: Record<string, string>;
}

interface TraceViewProps {
  nodes: TreeNode[];
  labels: Record<string, string>;
  className?: string;
}

export function TraceView({ nodes, className, labels }: TraceViewProps) {
  return (
    <div className={cn("w-full", className)}>
      {nodes.map((node) => (
        <TraceNode key={node.id} node={node} level={0} labels={labels} />
      ))}
    </div>
  );
}

function TraceNode({ node, level, className, labels }: TreeNodeProps) {
  const [selected, setSelected] = useState(false);

  const handleSelect = () => {
    setSelected(!selected);
  };

  const hasChildren = node.children && node.children.length > 0;

  function label(
    node: TreeNode,
    labels: Record<string, string>,
  ): React.JSX.Element {
    if (node?.metadata?.details?.error) {
      return (
        <span className="text-red-800">{`${labels[node?.metadata?.traceInfo?.trace?.address]}::${node?.metadata.details.name} ${node.metadata.details.error.args[0]}`}</span>
      );
    }

    if (node?.metadata?.traceInfo?.trace?.kind === "CREATE") {
      return (
        <span className="text-solidity-value">{`new ${labels[node?.metadata?.traceInfo?.trace?.address]}()`}</span>
      );
    }

    if (
      node?.metadata?.traceInfo?.trace?.kind === "CALL" ||
      node?.metadata?.traceInfo?.trace?.kind === "STATICCALL"
    ) {
      return (
        <span className="text-solidity-callname">{`${labels[node?.metadata?.traceInfo?.trace?.address]}::${node?.metadata?.details?.name}()`}</span>
      );
    }

    if (node?.metadata?.details) {
      return <span>{node?.metadata?.details?.name}</span>;
    }

    return <span>{node?.label}</span>;
  }

  return (
    <div className={className}>
      <Collapsible defaultOpen={false}>
        <CollapsibleTrigger
          className={cn(
            "flex w-full cursor-pointer items-center rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50",
            node.metadata.status && node.metadata.status === "Success"
              ? "text-emerald-700"
              : "text-white-500",
          )}
          style={{ paddingLeft: `${level * 12}px` }}
          onClick={handleSelect}
        >
          {hasChildren ? (
            <ChevronRight className="mr-1 h-4 w-4 shrink-0 ui-open:rotate-90 transition-transform" />
          ) : (
            <div className="w-5" />
          )}

          <div className="shrink-0 justify-items-start">
            <p
              className={cn(
                "font-medium text-sm",
                node.metadata.status === "Failure"
                  ? "text-red-400"
                  : "text-white-500",
              )}
            >
              {label(node, labels)}
              <span className={"text-blue-300"}>
                {node.metadata.nodeType === "rootNode" &&
                  ` ${node.metadata.duration}`}
              </span>
            </p>
            <p className="text-left font-medium text-emerald-700 text-sm">
              {node.metadata.details && node.metadata.details.returns.length > 0
                ? ` [return] ${node.metadata.details.returns[0].varvalue}`
                : null}
            </p>
          </div>
        </CollapsibleTrigger>

        {hasChildren && (
          <CollapsibleContent>
            {node.children?.map((child) => (
              <TraceNode
                key={child.id}
                node={child}
                level={level + 1}
                labels={labels}
              />
            ))}
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
