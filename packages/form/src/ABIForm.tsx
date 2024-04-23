import { useEffect, useState } from "react";
import { parseAbiItem, type AbiFunction, type AbiItem } from "viem";
import { encodeFunctionData } from "viem/utils";
import {
  Alert,
  Box,
  Button,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  alpha,
  type SxProps,
} from "@mui/material";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";
import { grey, red } from "@mui/material/colors";

import { parse } from "@ethui/abiparse";

interface AbiFormProps {
  abiItem: AbiItem | string;
  preview?: boolean;
  debug?: boolean;
}

interface BaseProps {
  name: string;
  type: string;
  label: string;
  debug: boolean;
  defaultValue?: any;
  onChange: (v: any) => void;
  headerActions?: React.ReactNode;
}

type InnerProps = BaseProps & { depth: number };

export function AbiForm({ abiItem, debug = false, preview }: AbiFormProps) {
  let item;
  try {
    item = (
      typeof abiItem === "string" ? parseAbiItem(abiItem) : abiItem
    ) as AbiFunction;
  } catch (e: any) {
    const msg = e.message.replace(/Version: abitype.*$/, "");
    return <Alert severity="error">{msg}</Alert>;
  }

  return <AbiFormInner {...{ item, debug, preview }} />;
}

type AbiFormInnerProps = Omit<AbiFormProps, "abiItem" | "debug"> & {
  item: AbiFunction;
  debug: boolean;
};

export function AbiFormInner({ item, debug, preview }: AbiFormInnerProps) {
  const [callData, setCalldata] = useState<`0x${string}` | undefined>();
  const [values, setValues] = useState(
    Array(item.inputs.length).fill(undefined),
  );

  useEffect(() => {
    try {
      const encoded = encodeFunctionData({
        abi: [item],
        functionName: item.name,
        args: values,
      });
      setCalldata(encoded);
    } catch (e) {
      setCalldata(undefined);
    }
  }, [values, item]);

  return (
    <Grid container spacing={2} onSubmit={(e) => e.preventDefault()}>
      <Grid item xs={12} md={4}>
        <Stack spacing={2} component="form" sx={{ p: 2 }}>
          {item.inputs.map((input, i) => (
            <AbiInput
              key={i}
              name={input.name || i.toString()}
              label={input.name || i.toString()}
              type={input.type}
              debug={debug}
              depth={1}
              onChange={(e) => {
                const newValues = [...values];
                newValues[i] = e;
                setValues(newValues);
              }}
            />
          ))}
          <Box>
            <Button variant="contained" type="submit">
              Submit
            </Button>
          </Box>
        </Stack>
      </Grid>
      {preview && (
        <Grid item xs={12} md={8}>
          <Paper sx={{ width: "100%", height: "100%" }}>
            <Stack spacing={1} sx={{ p: 2 }}>
              {item.inputs.map((input, i) => (
                <div key={i}>
                  <Typography fontWeight="bold">
                    {input.name || i.toString()}:
                  </Typography>
                  <Debug value={values[i]} />
                </div>
              ))}
              <Typography fontWeight="bold">calldata:</Typography>
              <Typography fontFamily="mono" sx={{ overflowWrap: "break-word" }}>
                {callData}
              </Typography>
            </Stack>
          </Paper>
        </Grid>
      )}
    </Grid>
  );
}

type AbiInputProps = InnerProps & { sx?: SxProps };

function AbiInput({
  label,
  type,
  headerActions,
  sx = {},
  ...rest
}: AbiInputProps) {
  const isArray = type.match(/\[\d*\]$/);

  return (
    <Box sx={{ width: "100%", pl: 1, ...sx }}>
      <Stack>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography fontWeight="bold">
            {label}
            <Typography sx={{ pl: 2 }} component="span" fontFamily="mono">
              {type}
            </Typography>
          </Typography>
          {headerActions}
        </Stack>
        {isArray ? (
          <ArrayInput {...{ label, type, ...rest }} />
        ) : (
          <Basic {...{ type, ...rest }} />
        )}
      </Stack>
    </Box>
  );
}

type ArrayInputProps = InnerProps;

function ArrayInput({
  label,
  type,
  defaultValue,
  onChange: parentOnChange,
  ...rest
}: ArrayInputProps) {
  const [tab, setTab] = useState("text");
  const [value, setValue] = useState<any[]>(defaultValue);

  const onTabChange = (_e: React.SyntheticEvent, v: string) => {
    setTab(v);
  };

  const onChange = (v: any) => {
    setValue(v);
  };

  useEffect(() => parentOnChange(value), [value, parentOnChange]);

  return (
    <Stack spacing={1}>
      <ToggleButtonGroup
        color="primary"
        value={tab}
        exclusive
        onChange={onTabChange}
        aria-label="Platform"
      >
        <ToggleButton value="text" size="small">
          Text
        </ToggleButton>
        <ToggleButton value="expanded" size="small">
          Expanded
        </ToggleButton>
      </ToggleButtonGroup>
      <>
        {tab === "text" && (
          <Basic
            {...{ ...rest, label, type }}
            onChange={onChange}
            defaultValue={value}
          />
        )}
        {tab === "expanded" && (
          <Box sx={{ borderLeft: `solid 3px ${grey[100]}`, pl: 1 }}>
            <ArrayElements
              {...{
                ...rest,
                elemType: type.replace(/\[\d*\]$/, ""),
                defaultValue: value,
              }}
              onChange={onChange}
            />
          </Box>
        )}
      </>
    </Stack>
  );
}

type BasicProps = Omit<InnerProps, "depth" | "type" | "label">;

function Basic({ name, defaultValue, onChange, debug }: BasicProps) {
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(parse(e.target.value));
  };

  useEffect(() => onChange(value), [value, onChange]);

  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        variant="standard"
        name={name}
        onChange={handleChange}
        defaultValue={defaultValue && stringify(defaultValue, 0)}
      />
      {debug && <Debug value={value} />}
    </Stack>
  );
}

type ArrayElementsProps = Omit<InnerProps, "type" | "label"> & {
  elemType: string;
  defaultValues?: any[];
};

function ArrayElements({
  name,
  depth,
  elemType,
  debug,
  onChange,
  defaultValue = [],
}: ArrayElementsProps) {
  const [value, setValue] = useState<any[]>(defaultValue);

  const append = () => {
    setValue([...value, undefined]);
  };

  const update = (idx: number, v: any) => {
    value[idx] = v;
    const newValue = [...value];
    setValue(newValue);
    onChange(newValue);
  };

  const remove = (idx: number) => {
    const newValue = value.filter((_v, i) => i !== idx);
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <Stack direction="column" spacing={1}>
      {value.map((v, i) => (
        <Stack direction="row" key={i} spacing={1}>
          <AbiArrayItemInput
            name={`${name}[${i}]`}
            depth={depth + 1}
            debug={debug}
            type={elemType}
            defaultValue={v}
            onChange={(v) => update(i, v)}
            onRemove={() => remove(i)}
          />
        </Stack>
      ))}
      <Box>
        <IconButton
          aria-label="delete"
          color="primary"
          size="small"
          onClick={(e) => {
            e.preventDefault();
            append();
          }}
        >
          <AddIcon />
        </IconButton>
      </Box>
      {debug && <Debug value={value} />}
    </Stack>
  );
}

type AbiArrayItemInputProps = Omit<InnerProps, "label"> & {
  onRemove: () => void;
};

function AbiArrayItemInput({
  name,
  depth,
  debug,
  type,
  defaultValue,
  onChange,
  onRemove,
}: AbiArrayItemInputProps) {
  const [deleteHover, setDeleteHover] = useState(false);

  return (
    <AbiInput
      name={name}
      label={name}
      depth={depth + 1}
      debug={debug}
      defaultValue={defaultValue}
      type={type}
      onChange={onChange}
      sx={{
        backgroundColor: deleteHover ? alpha(red["A100"], 0.1) : "initial",
        transition: "background-color 0.2s",
      }}
      headerActions={
        <IconButton
          aria-label="delete"
          color="error"
          size="small"
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          onClick={(e) => {
            e.preventDefault();
            onRemove();
          }}
        >
          <DeleteIcon />
        </IconButton>
      }
    />
  );
}

function Debug({ value }: { value: any }) {
  return <Typography fontFamily="mono">{stringify(value)}</Typography>;
}

function stringify(v: any, indent = 2) {
  const res = JSON.stringify(
    v,
    (_k, v) => {
      return typeof v === "bigint" ? `0x${v.toString(16)}` : v;
    },
    indent,
  );

  return res?.replace(/^"/, "").replace(/"$/, "");
}
