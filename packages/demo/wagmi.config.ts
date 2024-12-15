import { defineConfig } from "@wagmi/cli";
import { foundry, react } from "@wagmi/cli/plugins";

export default defineConfig({
  out: "src/wagmi.generated.ts",
  plugins: [
    foundry({
      project: "./",
      deployments: {
        NFT: { 31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
        Token: { 31337: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" },
        TestCalls: { 31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" },
      },
    }),
    react(),
  ],
  //contracts: [
  //  {
  //    name: "NFT",
  //    address: { 31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3" },
  //  },
  //  {
  //    name: "Token",
  //    address: { 31337: "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512" },
  //  },
  //  {
  //    name: "TestCalls",
  //    address: { 31337: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0" },
  //  },
  //],
});
