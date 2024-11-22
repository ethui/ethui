import type { Meta, StoryObj } from "@storybook/react";

import { EthuiLogo } from "../components/ethui-logo";

const meta: Meta<typeof EthuiLogo> = {
  title: "ethui/EthuiLogo",
  component: EthuiLogo,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    attention: { control: "boolean" },
    dev: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Regular: Story = {
  args: {},
};

export const Attention: Story = {
  args: {
    attention: true,
  },
};

export const Dev: Story = {
  args: { dev: true },
};

export const DevAttention: Story = {
  args: { dev: true, attention: true },
};
