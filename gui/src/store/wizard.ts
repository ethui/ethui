import { StateCreator, create } from "zustand";

const initialValues = { alchemyApiKey: "", useDefaultMnemonic: true };

interface Store {
  alchemyApiKey: { value: string; isDirty: boolean };

  setAlchemyApiKey: (key: string) => void;
}

const store: StateCreator<Store> = (set) => ({
  alchemyApiKey: { value: "", isDirty: false },
  useDefaultMnemonic: { value: true, isDirty: false },

  setAlchemyApiKey: (key: string) => {
    set({
      alchemyApiKey: {
        value: key,
        isDirty: key !== initialValues.alchemyApiKey,
      },
    });
  },
});

export const useWizardForm = create<Store>()(store);
