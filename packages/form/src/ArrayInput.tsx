import { Plus, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@ethui/ui/components/shadcn/button";
import { Separator } from "@ethui/ui/components/shadcn/separator";
import { AbiInput, type InnerProps } from "./AbiInput.tsx";
import { Basic } from "./Basic.tsx";
import { Debug } from "./utils.tsx";

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

  const onTabChange = (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    v: string,
  ) => {
    e.preventDefault();
    setTab(v);
  };

  const onChange = (v: any[]) => {
    setValue(v);
    parentOnChange(v);
  };

  return (
    <div className="m-1">
      <div className="flex items-center">
        <Button
          size="sm"
          variant={tab === "text" ? "secondary" : "outline"}
          onClick={(e) => onTabChange(e, "text")}
        >
          Text
        </Button>
        <Separator orientation="vertical" />
        <Button
          size="sm"
          variant={tab === "expanded" ? "secondary" : "outline"}
          onClick={(e) => onTabChange(e, "expanded")}
        >
          Expanded
        </Button>
      </div>
      <>
        {tab === "text" && (
          <Basic
            {...{ ...rest, label, type, defaultValue: value }}
            onChange={onChange}
          />
        )}
        {tab === "expanded" && (
          <div className="border-bg-secondary border-l-2 border-solid pl-1">
            <ArrayElements
              {...{
                ...rest,
                elemType: `${baseType}${subArrays}`,
                defaultValue: value,
              }}
              onChange={onChange}
            />
          </div>
        )}
      </>
    </div>
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
    <div className=" m-1 flex-col">
      {value.map((v, i) => (
        <div className="" key={i}>
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
        </div>
      ))}
      {!length && (
        <div>
          <Button
            aria-label="delete"
            color="primary"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              append();
            }}
          >
            <Plus />
          </Button>
        </div>
      )}
      {debug && <Debug value={value} />}
    </div>
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
      red
      deleteHover={deleteHover}
      headerActions={
        removable && (
          <Button
            aria-label="delete"
            color="error"
            size="icon"
            onMouseEnter={() => setDeleteHover(true)}
            onMouseLeave={() => setDeleteHover(false)}
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
          >
            <X />
          </Button>
        )
      }
    />
  );
}
