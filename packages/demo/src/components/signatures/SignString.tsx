import {
  Button,
  Stack,
  TextField,
  TextareaAutosize,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { useSignMessage } from "wagmi";

export function SignString() {
  const [message, setMessage] = useState("");
  const { data, signMessage } = useSignMessage();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        signMessage({ message });
      }}
    >
      <Typography variant="h2">Sign String</Typography>
      <Stack direction="column" spacing={2}>
        <TextField
          variant="outlined"
          name="message"
          placeholder="message"
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button variant="contained" type="submit">
          Sign Message
        </Button>
        <TextareaAutosize value={data} />
      </Stack>
    </form>
  );
}
