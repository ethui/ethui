import Chrome from "chrome";

declare namespace chrome {
  export default Chrome;
}

declare module "stream" {
  export interface Duplex {}
}

declare module "daisyui" {}
