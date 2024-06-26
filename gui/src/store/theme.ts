import { Theme } from "@mui/material";
import { event } from "@tauri-apps/api";
import { invoke } from "@tauri-apps/api/core";
import { Action } from "kbar";
import { create, StateCreator } from "zustand";

import { lightTheme, darkTheme } from "@ethui/react";
import { GeneralSettings } from "@ethui/types/settings";

interface Store {
	mode: "auto" | "light" | "dark";
	theme: Theme;
	actions: Action[];

	reload: () => Promise<void>;
	changeMode: (mode: "auto" | "light" | "dark") => void;
}

const actionId = "themeMode";

const store: StateCreator<Store> = (set, get) => ({
	mode: "auto",
	theme: lightTheme,

	actions: [
		{
			id: actionId,
			name: "Change theme",
			subtitle: "auto/dark/light",
			section: "Appearence",
			shortcut: ["T"],
		},
		...(["auto", "dark", "light"] as const).map((mode, index) => ({
			id: `${actionId}/${mode}`,
			name: `${index + 1}: ${mode}`,
			parent: actionId,
			perform: () => get().changeMode(mode),
		})),
	],

	async reload() {
		const { darkMode } = await invoke<GeneralSettings>("settings_get");

		const prefersDarkMode = window.matchMedia(
			"(prefers-color-scheme: dark)",
		).matches;

		const mode =
			darkMode == "auto" ? (prefersDarkMode ? "dark" : "light") : darkMode;
		const theme: Theme = mode === "dark" ? darkTheme : lightTheme;

		set({ mode, theme });
	},

	async changeMode(mode) {
		await invoke("settings_set_dark_mode", { mode });
		set({ mode });
		get().reload();
	},
});

event.listen("settings-changed", async () => {
	await useTheme.getState().reload();
});

export const useTheme = create<Store>()(store);

(async () => {
	await useTheme.getState().reload();
})();
