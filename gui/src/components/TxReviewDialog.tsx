import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ChangeEvent, useEffect, useState } from "react";
import { formatEther } from "viem";

import { useDialog } from "../hooks";
import { AddressView, ContextMenu } from "./";

export interface TxRequest {
  data: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

export function TxReviewDialog({ id }: { id: number }) {
  const { data, accept, reject } = useDialog<TxRequest>(id);

  const [gas, setGas] = useState<string>("");
  const [maxFeePerGas, setMaxFeePerGas] = useState<string>("");
  const [maxPriorityFeePerGas, setMaxPriorityFeePerGas] = useState<string>("");

  const [gasToSend, setGasToSend] = useState<string>("");
  const [maxBaseFeeToSend, setmaxBaseFeeToSend] = useState<string>("");
  const [priorityFeeoSend, setpriorityFeeoSend] = useState<string>("");

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    setGas(parseInt(data?.gas.toString(), 16).toString());
    setMaxFeePerGas(parseInt(data?.maxFeePerGas.toString(), 16).toString());
    setMaxPriorityFeePerGas(
      parseInt(data?.maxPriorityFeePerGas.toString(), 16).toString()
    );
  }, [data]);

  if (!data) return null;

  const {
    from,
    to,
    value: valueStr,
    data: calldata,
    gas: defaultGas,
    maxFeePerGas: defaultMaxFeePerGas,
    maxPriorityFeePerGas: defaultMaxPriorityFeePerGas,
  } = data;
  const value = BigInt(valueStr || 0);

  const handleGasChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setGas(event.target.value);
  };

  const handleMaxFeePerGasChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMaxFeePerGas(event.target.value);
  };

  const handleMaxPriorityFeePerGasChange = (
    event: ChangeEvent<HTMLTextAreaElement>
  ) => {
    setMaxPriorityFeePerGas(event.target.value);
  };

  const handleRestore = () => {
    setGas(defaultGas);
    setMaxFeePerGas(defaultMaxFeePerGas);
    setMaxPriorityFeePerGas(defaultMaxPriorityFeePerGas);
  };

  const handleSave = () => {
    handleRestore();
    setGasToSend(defaultGas);
    setmaxBaseFeeToSend(defaultMaxFeePerGas);
    setpriorityFeeoSend(defaultMaxPriorityFeePerGas);
    setIsExpanded(false);
  };

  return (
    <Stack direction="column" spacing={2} sx={{ p: 2 }}>
      <Typography variant="h6" component="h1">
        Transaction review
      </Typography>
      <Stack direction="row" justifyContent="space-between">
        <Stack direction="row" alignItems="center" spacing={1}>
          <AddressView address={from} /> <span>→</span>{" "}
          <AddressView address={to} />
        </Stack>
        <ContextMenu>{formatEther(BigInt(value))} Ξ</ContextMenu>
      </Stack>
      <Typography>data: {calldata}</Typography>

      <Accordion
        expanded={isExpanded}
        onChange={() => setIsExpanded(!isExpanded)}
      >
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Typography>Customize Gas</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TextField
            label="Max base fee"
            value={maxFeePerGas}
            fullWidth
            onChange={handleMaxFeePerGasChange}
          ></TextField>
          <TextField
            label="Priority fee"
            value={maxPriorityFeePerGas}
            fullWidth
            onChange={handleMaxPriorityFeePerGasChange}
          ></TextField>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography>Gas Limit</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                label="Gas Limit"
                value={gas}
                fullWidth
                onChange={handleGasChange}
              ></TextField>
            </AccordionDetails>
          </Accordion>

          <Stack
            direction="row"
            justifyContent="center"
            spacing={2}
            marginTop={2}
          >
            <Button onClick={handleRestore}>Restore Value</Button>
            <Button onClick={handleSave}>Save</Button>
          </Stack>
        </AccordionDetails>
      </Accordion>

      <Stack direction="row" justifyContent="center" spacing={2}>
        <Button variant="contained" color="error" onClick={() => reject()}>
          Cancel
        </Button>
        <Button variant="contained" type="submit" onClick={() => accept(data)}>
          Submit
        </Button>
      </Stack>
    </Stack>
  );
}
