import { Box, Stack, type SxProps, Typography } from "@mui/material";
import { useCallback } from "react";

import { ArrayInput } from "./ArrayInput";
import { Basic } from "./Basic";
import { matchArrayType } from "./utils";

export interface BaseProps {
  name: string;
  type: string;
  label: string;
  debug: boolean;
  defaultValue?: any;
  onChange: (v: any) => void;
  headerActions?: React.ReactNode;
}

export type InnerProps = BaseProps & { depth?: number };

export type AbiInputProps = InnerProps & { sx?: SxProps };

export function AbiInput({
  label,
  type,
  onChange: parentOnChange,
  headerActions,
  sx = {},
  ...rest
}: AbiInputProps) {
  const arrayMatch = matchArrayType(type);

  const onChange = useCallback(
    (v: any) => {
      parentOnChange(v);
    },
    [parentOnChange],
  );

  return (
    <Box sx={{ width: "100%", pl: 1, ...sx }}>
      <Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography fontWeight="bold">
            {label}
            <Typography sx={{ pl: 2 }} component="span" fontFamily="monospace">
              {type}
            </Typography>
          </Typography>
          {headerActions}
        </Stack>
        {arrayMatch ? (
          <ArrayInput
            {...{
              label,
              baseType: arrayMatch.base,
              subArrays: arrayMatch.subarrays,
              type,
              onChange,
              length: arrayMatch.length,
              ...rest,
            }}
          />
        ) : (
          <Basic {...{ type, onChange, ...rest }} />
        )}
      </Stack>
    </Box>
  );
}
