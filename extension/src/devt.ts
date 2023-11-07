import browser from "webextension-polyfill";

browser.devtools.panels.create("RPC Iron Calls", "icons/iron-48.png", "panel.html").then((extensionPanel) => {
	var _window: any; // Going to hold the reference to panel.html's `window`

	try {
		var data: any[] = [];
		var port = browser.runtime.connect({ name: "devtools" });
		port.onMessage.addListener(function (msg) {
			// Write information to the panel, if exists.
			// If we don't have a panel reference (yet), queue the data.
			console.log("panel.onMessage", msg);

			if (_window) {
				console.log("got window and ", msg);
				append_request(msg, _window);
			} else {
				data.push(msg);
			}
		});

		extensionPanel.onShown.addListener(function tmp(panelWindow) {
			extensionPanel.onShown.removeListener(tmp); // Run once only
			_window = panelWindow;
			console.log("showed window, updateding data", data);
			// Release queued data
			var msg;
			while ((msg = data.shift())) append_request(msg, _window);
			// Just to show that it's easy to talk to pass a message back:
			/* _window.respond = function (msg: stirng) {
				port.postMessage(msg);
			}; */
		});
	} catch (e) {
		console.error(e);
	}
});

function append_request(msg: string, _window: any) {
	//get the rpc-calls id in body and append the msg
	const rpcCalls = _window.document.getElementById("rpc-calls");
	if (!rpcCalls) {
		return;
	}

	const div = _window.document.createElement("div");
	const br = _window.document.createElement("br");
	div.textContent = msg;
	rpcCalls.appendChild(div);
	rpcCalls.appendChild(br);
}
