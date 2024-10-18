import Stack from "@mui/material/Stack";
import type { Meta, StoryObj } from "@storybook/react";

import { defaultDisabledArgs } from "../../utils";
import { Typography, type TypographyProps } from "./";

const meta: Meta<spanProps> = {
  title: "Components/Typography",
  component: Typography,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Playground = {
  render: (args: TypographyProps) => (
    <span {...args}>The quick brown fox</span>
  ),
};

export const Variants: StoryObj<spanProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <Stack direction="column" spacing={2} maxWidth={300}>
        <span>The quick brown fox</span>
        <span mono>The quick brown fox</span>
      </Stack>
    );
  },
};
