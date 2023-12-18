import { StoryObj, type Meta } from "@storybook/react";

import { BigIntField } from "./BigIntField";
import { Stack } from "@mui/material";
import { useForm } from "react-hook-form";

const meta: Meta<object> = {
  title: "Components/Inputs",
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

type Story = StoryObj<typeof BigIntField>;

export const BigInt: Story = {
  render: (_story, { form }) => (
    <Stack spacing={2} maxWidth={300}>
      <BigIntField
        control={form.control}
        name="amount"
        decimals={18}
        {...form.register("value")}
      />
    </Stack>
  ),
};
