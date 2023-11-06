import { WindowPostMessageStream } from "@metamask/post-message-stream";
import { Duplex } from "stream";
import { runtime } from "webextension-polyfill";

function init() {
	if (document.prerendering) {
		document.addEventListener("prerenderingchange", () => {
			if (!document.prerendering) {
				init();
			}
		});
		return;
	}

	const inpageStream = new WindowPostMessageStream({
		name: "iron:contentscript",
		target: "iron:inpage",
	}) as unknown as Duplex;

	console.log("[Iron - devtools] inited", inpageStream);

	// bg stream
	const bgPort = runtime.connect({ name: "iron:contentscript" });

	// inpage -> bg
	inpageStream.on("data", (data) => {
		console.log(data);
		bgPort.postMessage(data);
	});
	// bg -> inpage
	bgPort.onMessage.addListener((data) => {
		console.log(data);
		//inpageStream.write(data);
		// add data to the id rpc-calls
		const rpcCalls = document.getElementById("rpc-calls");
		if (rpcCalls) {
			const newCall = document.createElement("div");
			newCall.innerText = JSON.stringify(data);
			rpcCalls.appendChild(newCall);
		}
	});
	bgPort.onDisconnect.addListener(() => console.error("[Iron - devtools] disconnected"));
}

init();
