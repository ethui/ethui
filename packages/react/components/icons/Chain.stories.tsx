import type { Meta, StoryObj } from "@storybook/react";

import { IconChain, type IconChainProps } from "./Chain";
import { defaultDisabledArgs } from "../../utils";
import { Stack } from "@mui/material";

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
