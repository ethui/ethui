import * as Constants from "@iron/constants";
import { SettingsSection } from ".";
import * as z from "zod";
import { deriveAddress } from "../addresses";
import { ethers } from "ethers";

const schema = z.object({
  mnemonic: z.string().regex(/^(\w+\s){11}\w+$/),
  derivationPath: z.string(),
  addressIndex: z.number().int().min(0).max(1000),
});

export type WalletSchema = z.infer<typeof schema>;

interface ExtraFields {
  address: string;
}

export const WalletSettings: SettingsSection<WalletSchema, ExtraFields> = {
  schema,

  defaults() {
    return {
      mnemonic: Constants.wallet.mnemonic,
      derivationPath: Constants.wallet.path,
      addressIndex: Constants.wallet.index,
      address: deriveAddress(
        Constants.wallet.mnemonic,
        Constants.wallet.path,
        Constants.wallet.index
      ),
    };
  },

  beforeUpdate(settings) {
    const { mnemonic, derivationPath, addressIndex } = settings;
    const walletNode = ethers.utils.HDNode.fromMnemonic(mnemonic);

    return {
      ...settings,
      address: walletNode.derivePath(`${derivationPath}/${addressIndex}`)
        .address,
    };
  },
};
