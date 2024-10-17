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
      <div className="m-1 flex-col" maxWidth={300}>
        {" "}
        <Typography>The quick brown fox</Typography>{" "}
        <Typography mono>The quick brown fox</Typography>{" "}
      </div>
    );
  },
};
