import { zodResolver } from "@hookform/resolvers/zod";
import { Backdrop, Button, CircularProgress, Typography } from "@mui/material";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";

import { Form } from "@ethui/react/components/Form";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/_dialog/dialog/wallet-unlock/$id")({
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
  const form = useForm({
    resolver: zodResolver(schema),
  });

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
      <Form
        form={form}
        onSubmit={onSubmit}
        className="flex flex flex-col gap-4"
      >
        <div className="flex m-1">
          <Typography>
            ethui is asking to unlock wallet <b>{name}:</b>
          </Typography>

          <Form.Text
            label="Password"
            name="password"
            type="password"
            helperText={
              (attempts !== 3 &&
                `Incorrect password, ${attempts} attempts left`) ||
              ""
            }
            fullWidth
          />
          <div className="flex  m-1">
            <Form.Submit label="Unlock" />
            <Button color="error" onClick={() => send("reject")}>
              Cancel
            </Button>
          </div>
        </div>
      </Form>
      <Backdrop open={loading}>
        <CircularProgress color="inherit" />
      </Backdrop>
    </>
  );
}
