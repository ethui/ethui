# ethui integration tests

[webdriverio]: https://webdriver.io/
[tauri-driver]: https://v2.tauri.app/develop/tests/webdriver/

This package uses [webdriverio][webdriverio] and the [tauri-driver][tauri-driver] to run integration tests for ethui.

The test harness works by:
- using `tauri.test.conf.json`
- compiling the rust app with the `test` feature flag
- using a different (orange) icon to visually distinguish from dev and prod builds
- using an empty `dev-data/integration-tests` as the base config directory

Tests are run with `pnpm run test`
