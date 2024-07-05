import { Grid, IconButton, Stack } from "@mui/material";
import { MoreVert as MoreVertIcon } from "@mui/icons-material";
import { Hash } from "viem";
import { useEffect, useState } from "react";

import { ContextMenuWithTauri } from "./ContextMenuWithTauri";
import { truncateHex } from "@/utils";
import { Datapoint } from "./Datapoint";
import { Modal } from "./Modal";

interface Props {
  hash: Hash;
}

export function HashView({ hash }: Props) {
  const [decimalValue, setDecimalValue] = useState("");
  const [unitValuesOpen, setUnitValuesOpen] = useState(false);

  useEffect(() => {
    setDecimalValue(BigInt(hash).toString(10));
  }, [hash]);

  const content = (
    <Grid container rowSpacing={1} columns={1}>
      <Datapoint
        label="Hexadecimal"
        value={
          <ContextMenuWithTauri copy={hash}>
            {truncateHex(hash)}
          </ContextMenuWithTauri>
        }
        size="small"
      />
      <Datapoint
        label="Decimal"
        value={
          <ContextMenuWithTauri copy={decimalValue}>
            {truncateHex(decimalValue)}
          </ContextMenuWithTauri>
        }
        size="small"
      />
    </Grid>
  );

  return (
    <Stack direction="row">
      <div style={{ display: "flex", alignItems: "center" }}>
        <ContextMenuWithTauri copy={hash}>
          {truncateHex(hash)}
        </ContextMenuWithTauri>

        <IconButton
          aria-label="transfer"
          onClick={() => setUnitValuesOpen(true)}
        >
          <MoreVertIcon />
        </IconButton>

        <Modal open={unitValuesOpen} onClose={() => setUnitValuesOpen(false)}>
          {content}
        </Modal>
      </div>
    </Stack>
  );
}
