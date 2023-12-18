import { type Meta, type StoryObj, type StoryFn } from "@storybook/react";

import { IconChain, IconChainProps } from "./Chain";
import { defaultDisabledArgs } from "../utils";
import type { Network } from "@iron/types/network";

const meta: Meta<IconChainProps> = {
  title: "Icons/IconChain",
  component: IconChain,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

const mainnet: Network = {
  name: "mainnet",
  explorer_url: "http://etherscan.io/",
  http_url: "http://127.0.0.1:8545",
  currency: "ETH",
  decimals: 18,
  chain_id: 1,
};

export const Chain: StoryObj<IconChainProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return <IconChain network={mainnet} />;
  },
};
