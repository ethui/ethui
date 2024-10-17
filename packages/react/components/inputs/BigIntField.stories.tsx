import type { Meta, StoryFn } from "@storybook/react";

import {} from "@mui/material";
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
          <div className="" spacing={2} maxWidth={300}>
            <Story form={form} />
          </div>
        </form>
      );
    },
  ],
};

export default meta;

export const BigIntExample: StoryFn<BigIntFieldProps> = (_story, { form }) => (
  <div spacing={2} maxWidth={300}>
    <BigIntField
      control={form.control}
      name="amount"
      decimals={18}
      {...form.register("value")}
    />
  </div>
);
