import { formatEther } from "viem";

export function truncateHex(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatTxType(type: number | undefined): string {
  switch (type) {
    case 0:
      return "Legacy";
    case 1:
      return "EIP-2930";
    case 2:
      return "EIP-1559";
    case 3:
      return "EIP-4844";
    default:
      return "Unknown";
  }
}

export function formatBalance(balance: bigint, decimals = 4): string {
  return Number(formatEther(balance))
    .toFixed(decimals)
    .replace(/\.?0+$/, "");
}

export function shortenProjectPath(
  path: string | undefined | null,
): string | null {
  if (!path) return null;

  // Strip build output directory (e.g., /out/, /artifacts/, etc.) to get project root
  const outIndex = path.indexOf("/out/");
  if (outIndex !== -1) {
    path = path.substring(0, outIndex);
  }

  // Replace home directory with ~
  const homeDir = path.match(/^(\/home\/[^/]+|\/Users\/[^/]+)/)?.[0];
  if (homeDir) {
    path = path.replace(homeDir, "~");
  }

  return path;
}

export interface ProjectPathPart {
  text: string;
  type: "prefix" | "gitRepo" | "suffix";
}

/**
 * Format project path intelligently with git awareness
 * Returns array of path parts with their types for styling
 */
export function formatProjectPath(
  contractsRoot: string,
  gitRoot?: string,
): ProjectPathPart[] {
  // Replace home directory with ~
  const homeDir = contractsRoot.match(/^(\/home\/[^/]+|\/Users\/[^/]+)/)?.[0];
  let displayPath = contractsRoot;
  if (homeDir) {
    displayPath = displayPath.replace(homeDir, "~");
  }

  if (!gitRoot) {
    // No git root, return the whole path as prefix
    return [{ text: displayPath, type: "prefix" }];
  }

  // Also replace home in git root
  let displayGitRoot = gitRoot;
  if (homeDir) {
    displayGitRoot = displayGitRoot.replace(homeDir, "~");
  }

  // Check if contracts root is within git root
  if (!contractsRoot.startsWith(gitRoot)) {
    // Contracts root is not within git root, just use simple display
    return [{ text: displayPath, type: "prefix" }];
  }

  // Split paths into parts
  const gitParts = displayGitRoot.split("/").filter(Boolean);
  const contractsParts = displayPath.split("/").filter(Boolean);

  // Find where they diverge
  let commonLength = 0;
  while (
    commonLength < gitParts.length &&
    gitParts[commonLength] === contractsParts[commonLength]
  ) {
    commonLength++;
  }

  // Build the result
  const result: ProjectPathPart[] = [];

  // Prefix: path up to (but not including) git repo name, with abbreviation
  if (commonLength > 1) {
    const prefixParts = gitParts.slice(0, -1);
    const abbreviated = prefixParts
      .map((part) => (part === "~" ? part : part[0]))
      .join("/");
    result.push({ text: abbreviated + "/", type: "prefix" });
  } else if (commonLength === 1 && gitParts[0] === "~") {
    result.push({ text: "~/", type: "prefix" });
  }

  // Git repo name (last part of git root)
  const gitRepoName = gitParts[gitParts.length - 1];
  result.push({ text: gitRepoName, type: "gitRepo" });

  // Suffix: path from git root to contracts root
  const suffixParts = contractsParts.slice(commonLength);
  if (suffixParts.length > 0) {
    result.push({ text: "/" + suffixParts.join("/"), type: "suffix" });
  }

  return result;
}
