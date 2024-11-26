import type { Meta, StoryObj } from "@storybook/react";

import { ChainView } from "../components/chain-view";

const meta = {
  title: "Components/ChainView",
  component: ChainView,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    chainId: { control: "number" },
    name: { control: "text" },
  },
} satisfies Meta<typeof ChainView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mainnet: Story = {
  args: {
    chainId: 1,
    name: "Mainnet",
  },
};

export const Anvil: Story = {
  args: {
    chainId: 31337,
    name: "Anvil",
  },
};

export const Op: Story = {
  args: {
    chainId: 10,
    name: "Optimism",
  },
};
