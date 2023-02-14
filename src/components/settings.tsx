import { useStore } from "../store";
import { useForm } from "react-hook-form";

export function Settings() {
  const [mnemonic, rpc, setSettings] = useStore((state) => [
    state.mnemonic,
    state.rpc,
    state.setSettings,
  ]);

  const { register, handleSubmit } = useForm();
  const onSubmit = (data: any) => setSettings(data);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <FormControl
        name="Mnemonic"
        register={register("mnemonic")}
        value={mnemonic}
      />
      <FormControl name="RPC" register={register("rpc")} value={rpc} />

      <div className="m-2">
        <input type="submit" value="Save" className="p-2 btn btn-primary" />
      </div>
    </form>
  );
}

interface FormControlProps {
  name: string;
  register: any;
  value: string;
}

function FormControl({ name, register, value }: FormControlProps) {
  return (
    <div className="form-control w-full max-w-xs m-2">
      <label className="label">
        <span className="label-text">{name}</span>
      </label>
      <input
        type="text"
        {...register}
        defaultValue={value}
        className="input input-bordered w-full max-w-xs"
      />
    </div>
  );
}
