chrome.devtools.panels.create("RPC Iron Calls", "icons/iron-48.png", "panel.html", (panel) => {
	// Create a connection to the service worker
	var backgroundPageConnection = chrome.runtime.connect({
		name: "panel",
	});

	backgroundPageConnection.onMessage.addListener((message) => {
		console.log("messag e listener", message);
	});

	panel.onShown.addListener((window) => {
		const rpcCalls = window.document.getElementById("rpc-calls");
		console.log("panel", panel);
		console.log("rpcCalls", rpcCalls);

		chrome.runtime.onMessage.addListener((message) => {
			console.log("msg", message);
			if (message.type === "rpc-call") {
				const { method, params } = message.payload;
				const li = window.document.createElement("li");
				li.textContent = `${method}(${JSON.stringify(params)})`;
				rpcCalls.appendChild(li);
			}
		});
	});
});
