import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import { z } from "zod";
import { useDialog } from "#/hooks/useDialog";

export const Route = createFileRoute("/dialog/_l/wallet-unlock/$id")({
  component: WalletUnlockDialog,
});

interface Request {
  name: string;
  file: string;
}

const schema = z.object({ password: z.string() });

function WalletUnlockDialog() {
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
      form.setError("password", {
        message: `Incorrect password, ${attempts} attempts left`,
      });
      setLoading(false);
    });

    return () => {
      unlisten.then((cb) => cb());
    };
  }, [attempts, listen, form.setError]);

  if (!data) return null;

  const { name } = data;

  const onSubmit = (data: FieldValues) => {
    send(data);
    setLoading(true);
  };

  return (
    <Form
      form={form}
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-2"
    >
      <Form.Text
        label={
          <>
            unlock wallet <b>{name}</b>
          </>
        }
        name="password"
        type="password"
        className="w-full"
      />
      <div className="flex w-full items-center justify-center gap-2">
        <Button
          type="button"
          disabled={loading}
          variant="destructive"
          color="error"
          onClick={() => send("reject")}
        >
          Cancel
        </Button>
        <Form.Submit label="Unlock" isSubmitting={loading} />
      </div>
    </Form>
  );
}
