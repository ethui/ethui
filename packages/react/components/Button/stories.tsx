import Stack from "@mui/material/Stack";
import type { Meta, StoryObj } from "@storybook/react";

import { defaultDisabledArgs } from "../../utils";
import { Button, type ButtonProps } from "./";
import { Button as ShadButton } from "../../components/ui/button";
import { ReloadIcon } from "@radix-ui/react-icons";

const meta: Meta<ButtonProps> = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Playground = {
  render: (args: ButtonProps) => <Button {...args} />,
  args: {
    label: "Click me!",
    variant: "contained",
  },
};

export const Variants: StoryObj<ButtonProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <ShadButton variant="destructive">
        <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
        Click
      </ShadButton>
    );
  },
};

export const Colors: StoryObj<ButtonProps> = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" label="Primary" />
      <Button variant="contained" color="secondary" label="Secondary" />
      <Button variant="contained" color="success" label="Success" />
      <Button variant="contained" color="error" label="Error" />
    </Stack>
  ),
};

export const Sizes: StoryObj<ButtonProps> = {
  render: () => (
    <Stack spacing={2} maxWidth={300}>
      <Button variant="contained" size="small" label="Small" />
      <Button variant="contained" size="medium" label="Medium" />
      <Button variant="contained" size="large" label="Large" />
    </Stack>
  ),
};
