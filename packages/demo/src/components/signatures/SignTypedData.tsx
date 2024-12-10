import {
  Button,
  Stack,
  TextField,
  TextareaAutosize,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Address, useSignTypedData } from "wagmi";

export function SignTypedData() {
  const [fromName, setFromName] = useState("");
  const [fromWallet, setFromWallet] = useState<Address>("0x0");
  const [toName, setToName] = useState("");
  const [toWallet, setToWallet] = useState<Address>("0x0");
  const [contents, setContents] = useState("");

  const message = {
    from: {
      name: fromName,
      wallet: fromWallet,
    },
    to: {
      name: toName,
      wallet: toWallet,
    },
    contents,
  } as const;

  const { data, signTypedData } = useSignTypedData(
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        console.log("her");
        signTypedData({ domain, primaryType: "Mail", types, message });
      }}
    >
      <Typography variant="h2">Sign EIP712 Typed Data</Typography>
      <Stack direction="column" spacing={2}>
        <TextField
          variant="outlined"
          name="from_name"
          placeholder="from (name)"
          onChange={(e) => setFromName(e.target.value)}
        />
        <TextField
          variant="outlined"
          name="from_wallet"
          placeholder="from (wallet)"
          onChange={(e) => setFromWallet(e.target.value as Address)}
        />
        <TextField
          variant="outlined"
          name="to_name"
          placeholder="to (name)"
          onChange={(e) => setToName(e.target.value)}
        />
        <TextField
          variant="outlined"
          name="from_wallet"
          placeholder="from (wallet)"
          onChange={(e) => setToWallet(e.target.value as Address)}
        />
        <TextField
          variant="outlined"
          name="contents"
          placeholder="contents"
          onChange={(e) => setContents(e.target.value)}
        />
        <Button variant="contained" type="submit">
          Sign EIP712 Data
        </Button>
        <TextareaAutosize value={data} />
      </Stack>
    </form>
  );
}

// All properties on a domain are optional
const domain = {
  name: "Ether Mail",
  version: "1",
  chainId: 31337,
  verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
} as const;

// The named list of all type definitions
const types = {
  Person: [
    { name: "name", type: "string" },
    { name: "wallet", type: "address" },
  ],
  Mail: [
    { name: "from", type: "Person" },
    { name: "to", type: "Person" },
    { name: "contents", type: "string" },
  ],
} as const;
