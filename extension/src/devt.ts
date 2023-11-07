import { JsonRpcRequest } from "@metamask/utils";
import browser from "webextension-polyfill";

interface RPCRequestDev extends JsonRpcRequest {
	timestamp: number;
}

browser.devtools.panels.create("RPC Iron Calls", "icons/iron-48.png", "panel.html").then((extensionPanel) => {
	let _window: Window; // Going to hold the reference to panel.html's `window`

	try {
		const data: RPCRequestDev[] = [];
		const port = browser.runtime.connect({ name: "devtools" });
		port.onMessage.addListener(function (msg) {
			// Write information to the panel, if exists.
			// If we don't have a panel reference (yet), queue the data.
			const dataParsed: RPCRequestDev = JSON.parse(msg);
			if (_window) {
				append_request(dataParsed, _window);
			} else {
				data.push(dataParsed);
			}
		});

		extensionPanel.onShown.addListener(function tmp(panelWindow) {
			extensionPanel.onShown.removeListener(tmp); // Run once only
			_window = panelWindow;
			// Release queued data
			let msg;

			// exension panel is shown, append the data not shown yet.
			while ((msg = data.shift())) append_request(msg, _window);
			// pass a message back:
			/* _window.respond = function (msg: stirng) {
				port.postMessage(msg);
			}; */
		});
	} catch (e) {
		// console.error(e);
	}
});

function append_request(msg: RPCRequestDev, _window: Window) {
	//get the rpc-calls id in body and append the msg
	const rpcCalls = _window.document.getElementById("rpc-calls");
	if (!rpcCalls) {
		return;
	}

	// format time in HH:MM:SS with the day
	const date = new Date(msg.timestamp).toLocaleString("en-US", {
		hour12: false,
		hour: "numeric",
		minute: "numeric",
		second: "numeric",
	});

	const div = _window.document.createElement("div");
	const br = _window.document.createElement("br");
	// create a block that contains in each line the method and the params and the jsonrpc,
	// one for each line and the params formatted well along with the key names
	div.appendChild(_window.document.createTextNode("[" + date + "] "));
	// method in big and bold
	const method = _window.document.createElement("b").appendChild(_window.document.createTextNode(msg.method));
	div.appendChild(method);

	if (msg.params) {
		const params = _window.document.createElement("div");
		// msg.params is a json, seperate each param with a comma and a \n like this, ALSO, dont forget the ] at the end
		/* [
			"param1",
			"param2",
			"param3"
		] */
		const jsonString = "<pre>" + JSON.stringify(msg, null, "\t") + "</pre>";
		params.innerHTML = jsonString;

		div.appendChild(params);
	}

	div.appendChild(br);
	div.appendChild(br);

	rpcCalls.appendChild(div);
}
