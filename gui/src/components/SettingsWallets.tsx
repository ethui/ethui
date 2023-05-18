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
import { useCallback, useEffect } from "react";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import { useInvoke } from "../hooks/tauri";
import { Wallet, walletsSchema } from "../types";

type NewChild = { new?: boolean };

const emptyWallet: Wallet & NewChild = {
  name: "",
  dev: false,
  mnemonic: "",
  derivationPath: "",
  idx: 0,
  count: 1,
  new: true,
};

export function SettingsWallets() {
  // TODO on the first render this isn't cached yet
  // perhaps force this request somewhere else?
  // or trigger a reset of the form once it shows up?
  const { data: wallets, mutate } =
    useInvoke<(Wallet & NewChild)[]>("wallets_get_all");

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { isValid, dirtyFields, errors },
  } = useForm({
    mode: "onBlur",
    resolver: zodResolver(walletsSchema),
    defaultValues: { wallets },
  });
  // TODO: https://github.com/react-hook-form/react-hook-form/issues/3213
  const isDirtyAlt = !!Object.keys(dirtyFields).length;

  // default values are async, need to reset once they're ready
  useEffect(() => {
    if (!wallets) return;
    reset({ wallets });
  }, [reset, wallets]);

  const { fields, append, remove } = useFieldArray({
    control,
    name: "wallets",
  });

  const onSubmit = useCallback(
    async (data: { wallets?: Wallet[] }) => {
      reset(data);
      await invoke("wallets_set_list", { list: data.wallets });
      mutate();
    },
    [reset, mutate]
  );

  if (!wallets) return null;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        {fields.map((field, index) => {
          //        const item = wallets[index];
          const err = (errors.wallets && errors.wallets[index]) || {};
          return (
            <Accordion key={field.id} defaultExpanded={field.new}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                {field.name}
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2} alignItems="flex-start" key={field.id}>
                  <Stack spacing={2} direction="row">
                    <TextField
                      label="Name"
                      error={!!err.name}
                      helperText={err.name?.message?.toString()}
                      {...register(`wallets.${index}.name`)}
                    />

                    <FormControl error={!!err.dev}>
                      <FormGroup>
                        <FormControlLabel
                          label="Dev account"
                          control={
                            <Controller
                              name={`wallets.${index}.dev`}
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
                    label="Mnemonic"
                    error={!!err.mnemonic}
                    helperText={err.mnemonic?.message?.toString() || ""}
                    fullWidth
                    {...register(`wallets.${index}.mnemonic`)}
                  />
                  <TextField
                    label="Derivation Path"
                    spellCheck="false"
                    error={!!err.derivationPath}
                    helperText={err.derivationPath?.message?.toString() || ""}
                    {...register(`wallets.${index}.derivationPath`)}
                  />
                  <TextField
                    label="Index"
                    spellCheck="false"
                    error={!!err.idx}
                    type="number"
                    helperText={err.idx?.message?.toString() || ""}
                    {...register(`wallets.${index}.idx`, {
                      valueAsNumber: true,
                    })}
                  />
                  <TextField
                    label="Count"
                    spellCheck="false"
                    error={!!err.count}
                    type="number"
                    helperText={err.count?.message?.toString() || ""}
                    {...register(`wallets.${index}.count`, {
                      valueAsNumber: true,
                    })}
                  />
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
      </Stack>
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
          onClick={() => append(emptyWallet)}
        >
          Add wallet
        </Button>
      </Stack>
    </form>
  );
}
