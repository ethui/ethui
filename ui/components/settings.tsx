import { useStore } from "../store";
import { useForm } from "react-hook-form";

export function Settings() {
  const [mnemonic, rpc, setSettings] = useStore((state) => [
    state.mnemonic,
    state.rpc,
    state.setSettings,
  ]);

  const { register, handleSubmit, formState: { errors } } = useForm();
  const onSubmit = (data: any) => setSettings(data);

  return (
    <>
      <h2 className="text-xl">Settings</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <FormControl
          name="Mnemonic"
          register={register("mnemonic", {
            pattern: {
              value: /^(\w+\s){11}\w+$/i,
              message: 'invalid mnemonic'
            }
          })}
          value={mnemonic}
          error={errors.mnemonic ? errors.mnemonic.message?.toString() : undefined } 
        />
        
        <FormControl 
          name="RPC"
          register={register("rpc", {
            pattern: {
              value: /^(https?):\/\/[^\s/$.?#].[^\s]*$/i,
              message: 'invalid rpc host'
            }
          })} 
          value={rpc} 
          error={errors.rpc ? errors.rpc.message?.toString() : undefined } 
        />
        
        <div className="m-2">
          <input type="submit" value="Save" className="p-2 btn btn-primary" />
        </div>
      </form>
    </>
  );
}

interface FormControlProps {
  name: string;
  register: any;
  value: string;
  error: string | undefined;
}

function FormControl({ name, register, value, error = undefined }: FormControlProps) {
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
      {error && <p>&#9888; {error} </p>}
    </div>
  );
}
