import { useSettings } from "#/store/useSettings";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";
import { type FieldValues, useForm } from "react-hook-form";
import z from "zod";

export const Route = createFileRoute("/home/_l/settings/_l/stacks")({
  beforeLoad: () => ({ breadcrumb: "Stacks" }),
  component: () => <SettingsStacks />,
});

function SettingsStacks() {
  const stacks = useSettings((s) => s.settings?.stacks);
  const [email, setEmail] = useState("");

  const emailForm = useForm({
    mode: "onChange",
    resolver: zodResolver(z.object({ email: z.string().email() })),
  });

  const verifyForm = useForm({
    mode: "onChange",
    resolver: zodResolver(z.object({ code: z.string() })),
  });

  const onSendCodeSubmit = (params: FieldValues) => {
    console.log("here");
    invoke("settings_stacks_auth_send_code", { email: params.email });
    setEmail(params.email);
  };

  const onVerifyCodeSubmit = async (params: FieldValues) => {
    await invoke("settings_stacks_auth_verify_code", {
      email: email,
      code: params.code,
    });
  };

  if (stacks) {
    return <LogoutForm />;
  } else if (!email || email.length === 0) {
    // email form
    return (
      <Form key="emailForm" form={emailForm} onSubmit={onSendCodeSubmit}>
        <Form.Text name="email" label="Email" className="w-full" />

        <Form.Submit label="Send verification code" />
      </Form>
    );
  } else {
    console.log("here");
    // code form
    return (
      <Form key="codeForm" form={verifyForm} onSubmit={onVerifyCodeSubmit}>
        <Form.Text name="code" label="Code" className="w-full" />

        <Form.Submit label="Verify" />
      </Form>
    );
  }
}

function LogoutForm() {
  const { email } = useSettings((s) => s.settings?.stacks!);
  return (
    <>
      <p>Signed in as: {email}</p>
      <Button
        onClick={() => invoke("settings_set", { params: { stacks: null } })}
      >
        Logout
      </Button>
    </>
  );
}
