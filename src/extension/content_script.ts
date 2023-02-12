console.log("Content script works!");

import { Provider } from "../provider";

function main() {
  const provider = new Provider();
  console.log(provider);
  // Do what you want
  console.log("hello from content_script_main");
}

main();
