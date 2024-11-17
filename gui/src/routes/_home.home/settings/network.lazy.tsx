import { createLazyFileRoute } from "@tanstack/react-router";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@ethui/ui/components/shadcn/accordion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useShallow } from "zustand/shallow";

import { type Network, networkSchema } from "@ethui/types/network";
import { ChainView } from "@ethui/ui/components/chain-view";
import { Form } from "@ethui/ui/components/form";
import { Button } from "@ethui/ui/components/shadcn/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@ethui/ui/components/shadcn/dialog";
import { AppNavbar } from "#/components/AppNavbar";
import { useNetworks } from "#/store/useNetworks";

export const Route = createLazyFileRoute("/_home/home/settings/network")({
  component: () => (
    <>
      <AppNavbar title="Settings » Networks" />
      <div className="m-4">
        <SettingsNetworks />
      </div>
    </>
  ),
});

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

function SettingsNetworks() {
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
            <AccordionItem value={field.id} key={field.id}>
              <AccordionTrigger>
                {field.chain_id && (
                  <ChainView chainId={field.chain_id} name={field.name} />
                )}
                {!field.chain_id && "new network"}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex w-full flex-col items-start gap-2">
                  <div className="flex flex-row gap-2">
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
                    className="w-full"
                  />
                  <Form.Text
                    label="WebSockets RPC"
                    name={`networks.${index}.ws_url`}
                    className="w-full"
                  />
                  <Form.Text
                    label="Explorer URL"
                    name={`networks.${index}.explorer_url`}
                    className="w-full"
                  />
                  <div className="flex flex-row gap-2">
                    <Form.Text
                      label="Currency"
                      name={`networks.${index}.currency`}
                    />
                    <Form.NumberField
                      label="Decimals"
                      name={`networks.${index}.decimals`}
                    />
                  </div>

                  <Button variant="destructive" onClick={() => remove(index)}>
                    Remove
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      <div className="m-2 mt-4 mb-2 flex w-full justify-between gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive">Reset All</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle
                style={{ cursor: "move" }}
                id="draggable-dialog-title"
              >
                Reset Networks
              </DialogTitle>
            </DialogHeader>
            You are about to reset the networks to their default configuration.
            This action will replace your existing networks.
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" autoFocus>
                  Cancel
                </Button>
              </DialogClose>
              <DialogClose asChild>
                <Button variant="destructive" onClick={resetNetworks}>
                  Reset
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex gap-2">
          <Form.Submit label="Save" />

          <Button variant="outline" onClick={() => append(emptyNetwork)}>
            Add network
          </Button>
        </div>
      </div>
    </Form>
  );
}
