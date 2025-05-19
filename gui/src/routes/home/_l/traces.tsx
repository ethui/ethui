import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import type { ForgeTestTraceType } from "@ethui/types/traces";
import { TraceView } from "#/components/TraceViewer";
import { type TreeNode, convertToTreeData } from "#/lib/convertForgeTestTrace";

import { Button } from "@ethui/ui/components/shadcn/button";
import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { Interface } from "ethers";
import { useInvoke } from "#/hooks/useInvoke";
import { useContextStore } from "#/lib/contextStore";
import {
  parseConstructorData,
  parseFunctionData,
  parseLog,
  splitConstructorFromArguments,
} from "#/lib/dataParser";
import { useAbiStore } from "#/store/useAbiStore";

export const Route = createFileRoute("/home/_l/traces")({
  beforeLoad: () => ({ breadcrumb: "Traces" }),
  component: TraceViewer,
});

type ForgeAbi = {
  path: string;
  project: string;
  solidity_file: string;
  name: string;
  code: string;
  abi: any;
  method_identifiers: Record<string, string>;
};

type ABICollection = {
  interface: Interface;
  contractBytecode: string;
  methodIdentifiers: Record<string, string>;
};

function parseAbis(forgeAbis: ForgeAbi[]) {
  const abiCollection: Record<string, ABICollection> = {};
  const selectors: Record<string, string[]> = {};
  const signatures: Record<string, string[]> = {};
  const selectorsMap: Record<string, string> = {};

  if (forgeAbis) {
    for (const forgeAbi of forgeAbis) {
      const methodIdentifiers = forgeAbi.method_identifiers;
      const name = forgeAbi.name;

      abiCollection[name] = {
        interface: new Interface(forgeAbi.abi),
        contractBytecode: forgeAbi.code,
        methodIdentifiers,
      };

      for (const [signature, selector] of Object.entries(methodIdentifiers)) {
        if (!selectors[selector as string]) {
          selectors[selector as string] = [];
        }
        selectors[selector as string].push(name);

        if (!signatures[signature]) {
          signatures[signature] = [];
        }
        signatures[signature].push(name);
        selectorsMap[selector as string] = signature;
      }
    }
  }

  return { abiCollection, selectors, signatures, selectorsMap };
}

function TraceViewer() {
  const [tree, setTree] = useState<TreeNode[] | any>([]);
  const { abis, selectors, selectorsMap } = useAbiStore();
  const setAbiData = useAbiStore((state) => state.setAbiData);
  const { mergeAliasList } = useContextStore();

  const { data: forgeAbis } = useInvoke<ForgeAbi[]>("fetch_forge_abis");

  const handleClick = async () => {
    const selected = await open({ multiple: false, directory: false });

    if (typeof selected === "string") {
      const file = await readTextFile(selected);
      const parsedTrace: ForgeTestTraceType = JSON.parse(file);
      const computedTree = convertToTreeData(parsedTrace);

      setTree(computedTree);

      if (forgeAbis && forgeAbis?.length > 0) {
        const parsedAbis = parseAbis(forgeAbis);
        setAbiData(parsedAbis);
      }
    }
  };

  const addMetadataFieldAsync = useCallback(
    async (
      node: TreeNode,
      rootNode: TreeNode,
    ): Promise<Record<string, string>> => {
      const aliasSetInstance: Record<string, string> = {};
      if (node.metadata) {
        if (node.metadata.nodeType === "eventNode") {
          const address = node.metadata.contractAddress;
          const abiName = rootNode.metadata.newContractsCreated[address];
          const abiObj = abis[abiName];
          if (abiObj) {
            node.metadata.details = parseLog(
              abiObj.interface,
              node.metadata.logInfo,
            );
          }
        }

        if (node.metadata.nodeType === "traceNode") {
          const address = node.metadata.traceInfo.trace.address;
          // match address to new contract
          if (
            node.metadata.traceInfo?.trace.kind === "CREATE" ||
            node.metadata.traceInfo?.trace.kind === "CREATE2"
          ) {
            for (const abiName in abis) {
              const abiObj = abis[abiName];

              const split = splitConstructorFromArguments(
                node.metadata.traceInfo.trace.data,
              );

              if (abiObj.contractBytecode === split.contractData) {
                aliasSetInstance[address] = `${abiName}_inst`;
                rootNode.metadata.newContractsCreated[address] = abiName;
                node.metadata.details = parseConstructorData(
                  abiObj.interface,
                  split.constructorArgs,
                );
                node.metadata.details.contractName = abiName;
              }
            }
          }

          if (
            node.metadata.traceInfo.trace.kind === "CALL" ||
            node.metadata.traceInfo.trace.kind === "STATICCALL" ||
            node.metadata.traceInfo.trace.kind === "DELEGATECALL"
          ) {
            const signature = node.metadata.traceInfo.trace.data.substring(
              2,
              10,
            );
            node.metadata.selector = `0x${signature}`;

            // if it's a known contract, directly consult the func sig, otherwise brute force
            if (rootNode.metadata.newContractsCreated[address]) {
              const abiName = rootNode.metadata.newContractsCreated[address];
              const abiObj = abis[abiName];
              if (abiObj) {
                // if it has an abi but doesn't have the signature, it may be a proxy. call -> delegate. Search in children
                for (const fn in abiObj.methodIdentifiers) {
                  const abiSig = abiObj.methodIdentifiers[fn];
                  if (abiSig === signature) {
                    node.metadata.contractName = abiName;
                    node.metadata.details = parseFunctionData(
                      abiObj.interface,
                      `0x${signature}`,
                      node.metadata.traceInfo.trace.data,
                      node.metadata.traceInfo.trace.output,
                      node.metadata.traceInfo.trace.success,
                    );
                    break;
                  }
                }
                // If I guessed the contract but it doesn't have the selector, it's probably a proxy.
                if (!node.metadata.details) {
                  for (const child of node.children) {
                    if (!child.metadata.traceInfo) {
                      continue;
                    }
                    const childAbi =
                      abis[
                        rootNode.metadata.newContractsCreated[
                          child.metadata.traceInfo.trace.address
                        ]
                      ];
                    if (childAbi) {
                      for (const fn in childAbi.methodIdentifiers) {
                        const abiSig = childAbi.methodIdentifiers[fn];
                        if (abiSig === signature) {
                          node.metadata.contractName = abiName;
                          node.metadata.details = parseFunctionData(
                            childAbi.interface,
                            `0x${signature}`,
                            node.metadata.traceInfo.trace.data,
                            node.metadata.traceInfo.trace.output,
                            node.metadata.traceInfo.trace.success,
                          );
                          break;
                        }
                      }
                      if (node.metadata.details) {
                        break;
                      }
                    }
                  }
                }
              }
            } else {
              if (selectors[signature]) {
                if (selectors[signature].length === 1) {
                  rootNode.metadata.newContractsCreated[address] =
                    selectors[signature][0];
                  aliasSetInstance[address] = selectors[signature][0];
                }
                for (const abiName of selectors[signature]) {
                  const abiObj = abis[abiName];
                  const fn = selectorsMap[signature];
                  const abiSig = abiObj.methodIdentifiers[fn];
                  if (abiSig === signature) {
                    node.metadata.contractName = `*${abiName}`;
                    node.metadata.details = parseFunctionData(
                      abiObj.interface,
                      `0x${signature}`,
                      node.metadata.traceInfo.trace.data,
                      node.metadata.traceInfo.trace.output,
                      node.metadata.traceInfo.trace.success,
                    );
                    break;
                  }
                }
              } else {
                console.log("Can't find: ", signature);
              }
            }
          }
        }
      } else {
        node.metadata = {};
      }

      if (node.children && node.children.length > 0) {
        for (const child of node.children) {
          const processedAlias: Record<string, string> =
            await addMetadataFieldAsync(child, rootNode);

          Object.assign(aliasSetInstance, processedAlias);
        }
      }

      return aliasSetInstance;
    },
    [abis, selectors, selectorsMap],
  );

  const processTreeAsync = useCallback(async () => {
    if (tree?.treeData && abis) {
      const aliasSetInstance: Record<string, string> = {};
      const processNodeBatch = async (nodes: TreeNode[]) => {
        for (const node of nodes) {
          const processedAlias: Record<string, string> =
            await addMetadataFieldAsync(node, node);
          Object.assign(aliasSetInstance, processedAlias);
        }
      };

      const queue = [...tree.treeData];
      const batchSize = 10; // Process nodes in batches
      while (queue.length > 0) {
        const batch = queue.splice(0, batchSize);
        await processNodeBatch(batch);
      }

      Object.assign(tree.labels, aliasSetInstance);
      mergeAliasList(aliasSetInstance);
    }
  }, [tree, abis, mergeAliasList, addMetadataFieldAsync]);

  useEffect(() => {
    processTreeAsync();
  }, [processTreeAsync]);

  return (
    <>
      <Button
        variant="ghost"
        className="fixed right-6 bottom-6 h-fit border p-4"
        onClick={handleClick}
      >
        Load Trace
      </Button>
      {tree?.labels && <TraceView nodes={tree.treeData} labels={tree.labels} />}
    </>
  );
}
