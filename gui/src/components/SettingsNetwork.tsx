import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Network, networkSchema } from "../types";
import { ConfirmationDialog } from "./ConfirmationDialog";

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
  const { data: networks, mutate } =
    useInvoke<(Network & NewChild)[]>("networks_get_list");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, dirtyFields, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(networkSchema),
    defaultValues: { networks },
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  // default values are async, need to reset once they're ready
  useEffect(() => reset({ networks }), [reset, networks]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "networks",
  });

  const onSubmit = async (data: { networks?: Network[] }) => {
    await invoke("networks_set_list", { newNetworks: data.networks });
    reset(data);
    mutate();
  };

  const onReset = async () => {
    const networks: Network[] = await invoke("networks_reset");
    reset({ networks });
    mutate();
  };

  if (!networks) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => {
        //        const item = networks[index];
        const err = (errors.networks && errors.networks[index]) || {};
        return (
          <Accordion key={field.id} defaultExpanded={field.new}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              {field.name} - {field.chain_id}
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={2} alignItems="flex-start">
                <Stack spacing={2} direction="row">
                  <TextField
                    label="Name"
                    error={!!err.name}
                    helperText={err.name?.message?.toString()}
                    {...register(`networks.${index}.name`)}
                  />
                  <TextField
                    label="Chain Id"
                    error={!!err.chain_id}
                    helperText={err.chain_id?.message?.toString()}
                    {...register(`networks.${index}.chain_id`, {
                      valueAsNumber: true,
                    })}
                  />
                </Stack>
                <TextField
                  label="HTTP RPC"
                  {...register(`networks.${index}.http_url`)}
                  fullWidth
                  error={!!err.http_url}
                  helperText={err.http_url?.message?.toString()}
                />
                <TextField
                  label="WebSockets URL"
                  {...register(`networks.${index}.ws_url`)}
                  fullWidth
                  error={!!err.ws_url}
                  helperText={err.ws_url?.message?.toString()}
                />
                <TextField
                  label="Explorer URL"
                  {...register(`networks.${index}.explorer_url`)}
                  fullWidth
                  error={!!err.explorer_url}
                  helperText={err.explorer_url?.message?.toString()}
                />
                <Stack spacing={2} direction="row">
                  <TextField
                    label="Currency"
                    {...register(`networks.${index}.currency`)}
                    error={!!err.currency}
                    helperText={err.currency?.message?.toString()}
                  />
                  <TextField
                    label="Decimals"
                    {...register(`networks.${index}.decimals`, {
                      valueAsNumber: true,
                    })}
                    error={!!err.decimals}
                    helperText={err.decimals?.message?.toString()}
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
        <Button
          color="primary"
          variant="contained"
          type="submit"
          disabled={!isDirtyAlt || !isValid}
        >
          Save
        </Button>
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
        onConfirm={onReset}
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
    </form>
  );
}
