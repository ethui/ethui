import { IronProvider, attachGlobalProvider } from "../provider";

export class InPage {
  private provider: IronProvider;

  constructor() {
    console.log("[inpage] init");
    // this.provider = new IronProvider
    this.provider = new IronProvider();
    attachGlobalProvider(this.provider);
  }
}
