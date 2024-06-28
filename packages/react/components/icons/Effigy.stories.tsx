import type { Meta, StoryObj } from "@storybook/react";

import { IconEffigy, type IconEffigyProps } from "./Effigy";
import { defaultDisabledArgs } from "../../utils";
import { Stack } from "@mui/material";

const meta: Meta<IconEffigyProps> = {
  title: "Icons/IconEffigy",
  component: IconEffigy,
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Effigy: StoryObj<IconEffigyProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <Stack spacing={2} direction="row">
        <IconEffigy address="vitalik.eth" />
        <IconEffigy address="brantly.eth" />
        <IconEffigy address="huh.eth" />
        <IconEffigy address="galligan.eth" />
        <IconEffigy address="0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045" />
      </Stack>
    );
  },
};
