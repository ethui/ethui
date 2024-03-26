import { createLazyFileRoute } from "@tanstack/react-router";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Backdrop,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useDialog } from "@/hooks";

export const Route = createLazyFileRoute("/_dialog/dialog/wallet-unlock/$id")({
  component: WalletUnlockDialog,
});

interface Request {
  name: string;
  file: string;
}

const schema = z.object({ password: z.string() });

export function WalletUnlockDialog() {
  const { id } = Route.useParams();
  const { data, send, listen } = useDialog<Request>(id);
  const {
    handleSubmit,
    register,
    formState: { isDirty, isValid },
  } = useForm({ resolver: zodResolver(schema) });
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(3);

  // listen to failure events
  useEffect(() => {
    const unlisten = listen("failed", () => {
      setAttempts(attempts - 1);
      setLoading(false);
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [attempts, listen]);

  if (!data) return null;

  const { name } = data;

  const onSubmit = (data: FieldValues) => {
    send(data);
    setLoading(true);
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Stack spacing={2}>
          <Typography>
            ethui is asking to unlock wallet <b>{name}:</b>
          </Typography>

          <TextField
            label="Password"
            type="password"
            helperText={
              attempts !== 3 && `Incorrect password, ${attempts} attempts left`
            }
            fullWidth
            {...register("password")}
          />
          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              type="submit"
              disabled={!isDirty || !isValid}
            >
              Unlock
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => send("reject")}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      </form>
      <Backdrop open={loading}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
