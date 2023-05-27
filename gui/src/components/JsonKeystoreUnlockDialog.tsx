import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { useDialog } from "../hooks/useDialog";
import Panel from "./Panel";

interface Request {
  name: string;
  file: string;
}

const schema = z.object({ password: z.string() });

export function JsonKeystoreUnlockDialog({ id }: { id: number }) {
  const { data, accept, reject } = useDialog<Request>(id);
  const {
    handleSubmit,
    register,
    formState: { errors, isDirty, isValid },
  } = useForm({ resolver: zodResolver(schema) });

  if (!data) return null;

  const { name, file } = data;

  const onSubmit = (data: FieldValues) => {
    console.log(data);
    accept(data);
  };

  return (
    <Panel>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <Stack spacing={2}>
          <Typography>
            Iron Wallet is asking to unlock <b>{name}:</b>
          </Typography>

          <TextField
            label="Password"
            error={!!errors.password}
            helperText={errors.password?.message?.toString() || ""}
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
            <Button variant="contained" color="error" onClick={() => reject()}>
              Cancel
            </Button>
          </Stack>
        </Stack>
      </form>
    </Panel>
  );
}
