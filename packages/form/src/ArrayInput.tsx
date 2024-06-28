import {
  Box,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from "@mui/material";
import { useState } from "react";
import { red, grey } from "@mui/material/colors";
import { Delete as DeleteIcon, Add as AddIcon } from "@mui/icons-material";

import { AbiInput, type InnerProps } from "./AbiInput";
import { Basic } from "./Basic";
import { Debug } from "./utils";

type ArrayInputProps = InnerProps & {
  length?: number;
  baseType: string;
  subArrays?: string;
};

export function ArrayInput({
  label,
  baseType,
  subArrays,
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

  const onChange = (v: any[]) => {
    setValue(v);
    parentOnChange(v);
  };

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
            {...{ ...rest, label, type, defaultValue: value }}
            onChange={onChange}
          />
        )}
        {tab === "expanded" && (
          <Box sx={{ borderLeft: `solid 3px ${grey[100]}`, pl: 1 }}>
            <ArrayElements
              {...{
                ...rest,
                elemType: `${baseType}${subArrays}`,
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

type ArrayElementsProps = Omit<InnerProps, "type" | "label"> & {
  length?: number;
  elemType: string;
  defaultValues?: any[];
};

function ArrayElements({
  name,
  depth = 1,
  length,
  elemType,
  debug,
  onChange,
  defaultValue,
}: ArrayElementsProps) {
  const [value, setValue] = useState<any[]>(
    defaultValue || Array(length || 0).fill(undefined),
  );

  const append = () => {
    if (length) return;
    setValue([...value, undefined]);
  };

  const update = (idx: number, v: any) => {
    value[idx] = v;
    const newValue = [...value];
    setValue(newValue);
    onChange(newValue);
  };

  const remove = (idx: number) => {
    if (length) return;
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
            removable={!length}
            defaultValue={v}
            onChange={(v) => update(i, v)}
            onRemove={() => remove(i)}
          />
        </Stack>
      ))}
      {!length && (
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
      )}
      {debug && <Debug value={value} />}
    </Stack>
  );
}

type AbiArrayItemInputProps = Omit<InnerProps, "label" | "label"> & {
  depth: number;
  removable: boolean;
  onRemove: () => void;
};

function AbiArrayItemInput({
  name,
  depth,
  debug,
  type,
  defaultValue,
  removable,
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
        backgroundColor: deleteHover ? alpha(red.A100, 0.1) : "initial",
        transition: "background-color 0.2s",
      }}
      headerActions={
        removable && (
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
        )
      }
    />
  );
}
