import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
} from "@mui/material";
import { useFieldArray, useForm } from "react-hook-form";

import { type Network, networkSchema } from "@ethui/types/network";
import { ChainView, Form } from "@ethui/react/components";
import { ConfirmationDialog } from "@/components";
import { useNetworks } from "@/store";

type NewChild = { new?: boolean };

const emptyNetwork: Network & NewChild = {
  name: "",
  explorer_url: "",
  http_url: "",
  ws_url: "",
  currency: "",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain_id: undefined!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  decimals: undefined!,
  new: true,
};

export function SettingsNetwork() {
  const [networks, setNetworks, resetNetworks] = useNetworks((s) => [
    s.networks,
    s.setNetworks,
    s.resetNetworks,
  ]);

  const form = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: { networks: networks as (Network & NewChild)[] },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "networks",
  });

  const onSubmit = async (data: { networks?: Network[] }) => {
    if (!data.networks) return;

    await setNetworks(data.networks);
    form.reset(data);
  };

  if (!networks) return <>Loading</>;

  return (
    <Form form={form} onSubmit={onSubmit}>
      {fields.map((field, index) => {
        return (
          <Accordion key={field.id} defaultExpanded={field.new}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              {field.chain_id && (
                <ChainView chainId={field.chain_id} name={field.name} />
              )}
              {!field.chain_id && "new network"}
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2} alignItems="flex-start">
                <Stack spacing={2} direction="row">
                  <Form.Text label="Name" name={`networks.${index}.name`} />
                  <Form.NumberField
                    label="Chain Id"
                    name={`networks.${index}.chain_id`}
                  />
                </Stack>

                <Form.Text
                  label="HTTP RPC"
                  name={`networks.${index}.http_url`}
                  fullWidth
                />
                <Form.Text
                  label="WebSockets RPC"
                  name={`networks.${index}.ws_url`}
                  fullWidth
                />
                <Form.Text
                  label="Explorer URL"
                  name={`networks.${index}.explorer_url`}
                  fullWidth
                />
                <Stack spacing={2} direction="row">
                  <Form.Text
                    label="Currency"
                    name={`networks.${index}.currency`}
                  />
                  <Form.NumberField
                    label="Decimals"
                    name={`networks.${index}.decimals`}
                  />
                </Stack>

                <Button
                  color="warning"
                  size="small"
                  onClick={() => remove(index)}
                >
                  Remove
                </Button>
              </Stack>
            </AccordionDetails>
          </Accordion>
        );
      })}
      <Stack spacing={2} direction="row" sx={{ mt: 4, mb: 2 }}>
        <Form.Submit label="Save" />

        <Button
          variant="outlined"
          color="info"
          size="medium"
          onClick={() => append(emptyNetwork)}
        >
          Add network
        </Button>
      </Stack>

      <ConfirmationDialog
        content={
          <>
            You are about to reset the networks to their default configuration.
            This action will replace your existing networks.
          </>
        }
        title="Reset Networks"
        confirmationLabel="Reset Networks"
        onConfirm={resetNetworks}
      >
        {({ onOpen }) => (
          <Button
            variant="outlined"
            color="warning"
            size="medium"
            onClick={() => onOpen()}
          >
            Reset Networks
          </Button>
        )}
      </ConfirmationDialog>
    </Form>
  );
}
