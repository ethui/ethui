import ReactDOMServer from "react-dom/server";
import fs from "node:fs";
import { EthuiLogo } from "#/components/ethui-logo";

const svgString = ReactDOMServer.renderToStaticMarkup(<EthuiLogo />);
console.log(svgString);
function exportSvg(props: object, path: string) {
  const svgString = ReactDOMServer.renderToStaticMarkup(
    <EthuiLogo {...props} />,
  );
  fs.writeFileSync(path, svgString);
}
