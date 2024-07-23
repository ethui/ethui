import { Placement } from "react-joyride"; // Import the Placement type

export const steps = [
  {
    target: ".quick-select",
    title: "Wallet",
    content: "Quickly switch wallet, address and network.",
    placement: "right" as Placement,
    disableBeacon: true,
  },
  {
    target: ".fast-mode",
    title: "Fast-mode",
    content:
      "Skip the confirmation dialog when using a plaintext wallet on the anvil network.",
    placement: "right" as Placement,
  },
  {
    target: ".command-bar",
    title: "Command Bar",
    content:
      "Access the app's features instantly by pressing Ctrl+K (Cmd+K on Mac) to prompt the command bar, your main navigation tool within EthUI",
    placement: "top" as Placement,
  },
  {
    target: ".settings",
    title: "Settings",
    content:
      "Customize your EthUI experience by adjusting preferences, managing security options, and configuring application settings.",
    placement: "top" as Placement,
  },
  {
    target: '[homepage-tour="actions-Account"]',
    title: "Account",
    content:
      "View your account details, transfer tokens, or add addresses to the blacklist.",
    placement: "right" as Placement,
  },
  {
    target: '[homepage-tour="actions-Transactions"]',
    title: "Transactions",
    content:
      "Review all your transactions and access detailed information for each one.",
    placement: "right" as Placement,
  },
  {
    target: '[homepage-tour="actions-Contracts"]',
    title: "Contracts",
    content: "Explore all your smart contracts and see their specific details.",
    placement: "right" as Placement,
  },
  {
    target: '[homepage-tour="actions-Connections"]',
    title: "Network Connections",
    content:
      "Access an overview of all your network connections and their detailed information.",
    placement: "right" as Placement,
  },
];
