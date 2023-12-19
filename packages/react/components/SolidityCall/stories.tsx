import { type Meta, type StoryObj } from "@storybook/react";

import { SolidityCall, type SolidityCallProps } from "./";
import { Typography } from "../";
import { defaultDisabledArgs } from "../../utils";
import { Stack } from "@mui/material";

const meta: Meta<SolidityCallProps> = {
  title: "Components/SolidityCall",
  argTypes: {
    ...defaultDisabledArgs(),
  },
};

export default meta;

export const Call: StoryObj<SolidityCallProps> = {
  parameters: { controls: { exclude: ["classes"] } },
  render: () => {
    return (
      <Stack direction="column" spacing={2}>
        <SolidityCall
          to="0x6aD2...4E45"
          data="0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000"
          value={0n}
          chainId={1}
          decimals={18}
          abi={["function transfer(address from, uint256 amount)"]}
        />

        <SolidityCall
          to="0x6aD20ADF8ab9DB9B3B3F47987B3d87bFc4674E45"
          data="0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000"
          value={0n}
          chainId={1}
          decimals={18}
          abi={["function transfer(address from, uint256 amount)"]}
          ArgProps={{
            addressRenderer: () => (
              <Typography mono>custom address rendering</Typography>
            ),
          }}
        />
        <SolidityCall
          to="0x6aD2...4E45"
          data="0xa9059cbb0000000000000000000000006ad20adf8ab9db9b3b3f47987b3d87bfc4674e450000000000000000000000000000000000000000000000000000000773594000"
          value={0n}
          chainId={1}
          decimals={18}
        />
      </Stack>
    );
  },
};
