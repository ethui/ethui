import type { Meta, StoryObj } from "@storybook/react";

import { ChainIcon } from "../../components/icons/chain";

const meta = {
  title: "Icons/Chain",
  component: ChainIcon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    chainId: { control: "number" },
  },
} satisfies Meta<typeof ChainIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mainnet: Story = {
  args: {
    chainId: 1,
  },
};

export const Anvil: Story = {
  args: {
    chainId: 31337,
  },
};

export const Op: Story = {
  args: {
    chainId: 10,
  },
};
