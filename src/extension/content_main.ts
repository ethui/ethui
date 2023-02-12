import { Provider, attachGlobalProvider } from "../provider";

function main() {
  const provider = new Provider();
  attachGlobalProvider(provider);
}

main();
