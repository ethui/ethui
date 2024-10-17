import type { Meta, StoryFn } from "@storybook/react";

import { Stack } from "@mui/material";
import { useForm } from "react-hook-form";
import { BigIntField, type BigIntFieldProps } from "./BigIntField";

const meta: Meta<object> = {
  title: "Inputs/BigIntField",
  component: BigIntField,
  argTypes: {},

  decorators: [
    (Story) => {
      const form = useForm({ defaultValues: { value: 0n } });
      return (
        <form>
          <Stack spacing={2} maxWidth={300}>
            <Story form={form} />
          </Stack>
        </form>
      );
    },
  ],
};

export default meta;

export const BigIntExample: StoryFn<BigIntFieldProps> = (_story, { form }) => (
  <Stack spacing={2} maxWidth={300}>
    <BigIntField
      control={form.control}
      name="amount"
      decimals={18}
      {...form.register("value")}
    />
  </Stack>
);
