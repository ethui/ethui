import type { Meta, StoryObj } from "@storybook/react";

import { EffigyIcon } from "../../components/icons/effigy";

const meta = {
  title: "Icons/Effigy",
  component: EffigyIcon,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    address: { control: "text" },
  },
} satisfies Meta<typeof EffigyIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Address: Story = {
  args: {
    address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  },
};
