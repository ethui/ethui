import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { RowsIcon } from "@radix-ui/react-icons";

import { Button, type ButtonProps } from "../components/ui/button";

const meta: Meta<ButtonProps> = {
  title: "Example/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "text", defaultValue: { summary: "default" } },
  },
  args: { onClick: fn() },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Button",
  },
};

export const Outlined: Story = {
  args: {
    variant: "outline",
    children: "Outline",
  },
};

export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: "Destructive",
  },
};

export const Secondary: Story = {
  args: {
    variant: "secondary",
    children: "Secondary",
  },
};

export const Small: Story = {
  args: {
    size: "sm",
    children: "Small",
  },
};

export const WithIcon: Story = {
  args: {
    size: "sm",
    children: (
      <>
        <RowsIcon />
        With Icon
      </>
    ),
  },
};
