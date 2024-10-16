import type { Meta, StoryObj } from "@storybook/react";

import { Stack } from "@mui/material";
import { defaultDisabledArgs } from "../../utils";
import IconChain, { type IconChainProps } from "./Chain";

const meta: Meta<IconChainProps> = {
  title: "Icons/IconChain",
  component: IconChain,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Chain: StoryObj<IconChainProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <Stack spacing={2} direction="row">
        <IconChain chainId={1} />
        <IconChain chainId={10} />
        <IconChain chainId={31337} />
        <IconChain chainId={2} />
      </Stack>
    );
  },
};
