import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";

import { ClickToCopy } from "#/components/click-to-copy";

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
  title: "Components/ClickToCopy",
  component: ClickToCopy,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    text: { control: "text" },
    children: { control: "text" },
  },
} satisfies Meta<typeof ClickToCopy>;

export default meta;
type Story = StoryObj<typeof meta>;

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Primary: Story = {
  args: {
    text: "The quick brown fox",
    children: "The quick brown fox",
  },
};
