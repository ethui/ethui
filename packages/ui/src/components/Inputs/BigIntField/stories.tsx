import { StoryObj, type Meta } from "@storybook/react";

import { BigIntField } from "./";
import { Stack } from "@mui/material";
import { useForm } from "react-hook-form";

const meta: Meta<typeof BigIntField> = {
  title: "Components/Inputs/BigIntField",
  component: BigIntField,
  // decorators: [
  //   (Story) => {
  //     const form = useForm({ defaultValues: { value: 0n } });
  //     return (
  //       <form>
  //         <Stack spacing={2} maxWidth={300}>
  //           <Story form={form} />
  //         </Stack>
  //       </form>
  //     );
  //   },
  // ],
};

export default meta;

type Story = StoryObj<typeof BigIntField>;

// export const Field: Story = {
//   render: (_story, { form }) => (
//     <Stack spacing={2} maxWidth={300}>
//       <BigIntField
//         control={form.control}
//         name="amount"
//         decimals={18}
//         {...form.register("value")}
//       />
//     </Stack>
//   ),
// };
