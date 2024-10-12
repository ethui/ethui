import Stack from "@mui/material/Stack";
import type { Meta, StoryObj } from "@storybook/react";

import { defaultDisabledArgs } from "../../utils";
import { Typography, type TypographyProps } from "./";

const meta: Meta<TypographyProps> = {
  title: "Components/Typography",
  component: Typography,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Playground = {
  render: (args: TypographyProps) => (
    <Typography {...args}>The quick brown fox</Typography>
  ),
};

export const Variants: StoryObj<TypographyProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <Stack direction="column" spacing={2} maxWidth={300}>
        <Typography>The quick brown fox</Typography>
        <Typography mono>The quick brown fox</Typography>
      </Stack>
    );
  },
};
