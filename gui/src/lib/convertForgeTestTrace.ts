import type { ForgeTestTraceType } from "@ethui/types/traces";

export type TreeNode = {
  id: string;
  label: string;
  children: TreeNode[];
  metadata: any;
};

export const convertToTreeData = (nodes: ForgeTestTraceType) => {
  const treeData: TreeNode[] = [];
  let rootIdx = 0;
  const labels: Record<string, string> = {};

  for (const testFileKey in nodes) {
    const rootNode = nodes[testFileKey];

    const newRootNode = buildRootNode(testFileKey, `rootId${rootIdx}`, {
      duration: rootNode.duration,
      newContractsCreated: {},
    });

    // Starting with testResultNodes
    let testFunctionIdx = 1;
    for (const testFunctionKey in rootNode.test_results) {
      const testId = `testId${rootIdx}.${testFunctionIdx}`;
      const testFunctionNode = rootNode.test_results[testFunctionKey];
      const kind = testFunctionNode.kind;
      const traces = testFunctionNode.traces;

      //merge labeled addresses
      for (const address in testFunctionNode.labeled_addresses) {
        labels[address] = testFunctionNode.labeled_addresses[address];
      }

      if (kind.Unit) {
        const newTestResultNode = buildTestResultNode(testFunctionKey, testId, {
          status: testFunctionNode.status,
          reason: testFunctionNode.reason ? testFunctionNode.reason : "",
        });

        let segmentIdx = 1;
        for (const trace of traces) {
          const traceType = trace[0];
          const traceNodes = trace[1].arena;
          const itsASetup = traceType === "Setup";

          if (traceType === "Deployment") {
            continue;
          }

          if (itsASetup && testFunctionIdx !== 1) {
            // it's always the same setup after the first test -- this may change in the future
            continue;
          }

          const newSegmentNode = buildSegmentNode(
            traceType,
            itsASetup
              ? `traceId${rootIdx}.0`
              : `traceId${rootIdx}.${testFunctionIdx}.${segmentIdx}`,
            {
              segmentType: traceType,
            },
          );

          const tracesMap = new Map<number, TreeNode>();
          let traceIdx = 0;
          let logIdx = 0;

          for (const node of traceNodes) {
            const traceNode = buildTraceNode(
              `${node.trace.data}`,
              itsASetup
                ? `traceId${rootIdx}.0.${traceIdx}`
                : `traceId${rootIdx}.${testFunctionIdx}.${segmentIdx}.${traceIdx}`,
              {
                traceInfo: node,
              },
            );
            tracesMap.set(node.idx, traceNode);
            traceIdx++;
          }

          let root: TreeNode | null = null;

          for (const node of traceNodes) {
            const treeNode: TreeNode | undefined = tracesMap.get(node.idx);

            if (!treeNode)
              throw new Error(`something went wrong with: ${node.idx}`);

            const interleavedChildren: TreeNode[] = [];

            for (const orderItem of node.ordering) {
              if ("Call" in orderItem) {
                const child = tracesMap.get(node.children[orderItem.Call]);
                if (child) {
                  interleavedChildren.push(child);
                }
              } else if ("Log" in orderItem) {
                const log = node.logs[orderItem.Log];
                const logNode = buildLogNode(
                  `LogData: ${log}`,
                  itsASetup
                    ? `logId${rootIdx}.0.l.${logIdx}`
                    : `logId${rootIdx}.${testFunctionIdx}.${segmentIdx}.l.${logIdx}`,
                  {
                    logInfo: log,
                    contractAddress: node.trace.address,
                  },
                );
                interleavedChildren.push(logNode);
                logIdx++;
              }
            }

            treeNode.children = interleavedChildren;

            if (node.parent === null) {
              root = treeNode;
            } else {
              const parent = tracesMap.get(node.parent);
              if (parent && !parent.children.includes(treeNode)) {
                parent.children.push(treeNode);
              }
            }
          }

          if (!root) {
            throw new Error("No root node");
          }

          newSegmentNode.children.push(root);
          if (itsASetup) {
            newRootNode.children.push(newSegmentNode);
          } else {
            newTestResultNode.children.push(root);
          }
          segmentIdx++;
        }

        newRootNode.children.push(newTestResultNode);
      }

      testFunctionIdx++;
    }

    treeData.push(newRootNode);

    rootIdx++;
  }

  return { treeData, labels };
};

const buildRootNode = (label: string, id: string, metadata: any) => {
  metadata.nodeType = "rootNode";

  const newRootNode: TreeNode = {
    id,
    label,
    children: [],
    metadata,
  };

  return newRootNode;
};

const buildTestResultNode = (label: string, id: string, metadata: any) => {
  metadata.nodeType = "testResultNode";

  const newTestResultNode: TreeNode = {
    id,
    label,
    children: [],
    metadata,
  };

  return newTestResultNode;
};

const buildSegmentNode = (label: string, id: string, metadata: any) => {
  metadata.nodeType = "segmentNode"; // either a Setup or a Execution node, Deployment is ignored

  const newNode: TreeNode = {
    id,
    label,
    children: [],
    metadata,
  };

  return newNode;
};

const buildTraceNode = (label: string, id: string, metadata: any) => {
  metadata.nodeType = "traceNode";

  const newNode: TreeNode = {
    id,
    label,
    children: [],
    metadata,
  };

  return newNode;
};

const buildLogNode = (name: string, id: string, metadata: any): TreeNode => {
  metadata.nodeType = "eventNode";

  return {
    label: name,
    id,
    children: [],
    metadata,
  };
};
