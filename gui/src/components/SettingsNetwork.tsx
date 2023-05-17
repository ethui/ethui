import { zodResolver } from "@hookform/resolvers/zod";
import { ExpandMore } from "@mui/icons-material";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Stack,
  TextField,
} from "@mui/material";
import { invoke } from "@tauri-apps/api/tauri";
import React from "react";
import { useCallback } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Network, networkSchema } from "../types";

const emptyNetwork: Network = {
  name: "",
  dev: false,
  http_url: "",
  ws_url: "",
  currency: "",
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  chain_id: undefined!,
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  decimals: undefined!,
};

export function SettingsNetwork() {
  const { data: networks, mutate } = useInvoke<Network[]>("get_networks");

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

  const { fields, append, remove } = useFieldArray({
    control,
    name: "networks",
  });

  const onSubmit = useCallback(
    async (data: { networks?: Network[] }) => {
      reset(data);
      await invoke("set_networks", { networks: data.networks });
      mutate();
    },
    [reset, mutate]
  );

  if (!networks) return <>Loading</>;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {fields.map((field, index) => {
        //        const item = networks[index];
        const err = (errors.networks && errors.networks[index]) || {};
        return (
          <Accordion key={field.id}>
            <AccordionSummary expandIcon={<ExpandMore />}>foo</AccordionSummary>
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
                  <FormControl error={!!err.dev}>
                    <FormGroup>
                      <FormControlLabel
                        label="Dev mode"
                        control={
                          <Controller
                            name={`networks.${index}.dev`}
                            control={control}
                            render={({ field }) => {
                              return (
                                <Checkbox
                                  {...field}
                                  checked={field.value}
                                  onChange={(e) =>
                                    field.onChange(e.target.checked)
                                  }
                                />
                              );
                            }}
                          />
                        }
                      />
                    </FormGroup>
                    {err.dev && (
                      <FormHelperText>
                        {err.dev.message?.toString()}
                      </FormHelperText>
                    )}
                  </FormControl>
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
      <Stack spacing={2} direction="row" sx={{ mt: 4 }}>
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
    </form>
  );
}
