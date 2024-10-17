import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import { useShallow } from "zustand/shallow";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/ui/accordion";
import { useFieldArray, useForm } from "react-hook-form";

import { ChainView } from "@ethui/react/components/ChainView";
import { Form } from "@ethui/react/components/Form";
import { type Network, networkSchema } from "@ethui/types/network";
import { ConfirmationDialog } from "#/components/ConfirmationDialog";
import { useNetworks } from "#/store/useNetworks";
import { Button } from "@ethui/ui/components/ui/button";

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
  force_is_anvil: false,
  new: true,
};

export function SettingsNetwork() {
  const [networks, setNetworks, resetNetworks] = useNetworks(
    useShallow((s) => [s.networks, s.setNetworks, s.resetNetworks]),
  );

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
      <Accordion type="single" collapsible className="w-full">
        {fields.map((field, index) => {
          return (
            <AccordionItem key={field.id} defaultExpanded={field.new}>
              <AccordionTrigger expandIcon={<ExpandMore />}>
                {field.chain_id && (
                  <ChainView chainId={field.chain_id} name={field.name} />
                )}
                {!field.chain_id && "new network"}
              </AccordionTrigger>
              <AccordionContent>
                <div className="m-4 items-start">
                  <div className="m-4 flex">
                    <Form.Text label="Name" name={`networks.${index}.name`} />
                    <Form.NumberField
                      label="Chain Id"
                      name={`networks.${index}.chain_id`}
                    />

                    <Form.Checkbox
                      label="Anvil"
                      name={`networks.${index}.force_is_anvil`}
                    />
                  </div>

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
                  <div className="m-4 flex">
                    <Form.Text
                      label="Currency"
                      name={`networks.${index}.currency`}
                    />
                    <Form.NumberField
                      label="Decimals"
                      name={`networks.${index}.decimals`}
                    />
                  </div>

                  <Button color="warning" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="m-4 flex" sx={{ mt: 4, mb: 2 }}>
        <Form.Submit label="Save" />

        <Button variant="outline" onClick={() => append(emptyNetwork)}>
          Add network
        </Button>
      </div>

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
          <Button variant="destructive" onClick={() => onOpen()}>
            Reset Networks
          </Button>
        )}
      </ConfirmationDialog>
    </Form>
  );
}
