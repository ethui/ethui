import { Stack } from "@mui/material";
import { Box as BoxIcon } from "lucide-react";
import { Typography } from "../Typography";

export interface BlockNumberProps {
  number: number;
}

export const BlockNumber = ({ number }: BlockNumberProps) => (
  <Stack direction="row" alignItems="center" spacing={0}>
    <BoxIcon size={14} />
    <Typography variant="caption" color="success">
      {number}
    </Typography>
  </Stack>
);
