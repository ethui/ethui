# Integration Tests for ethui

This directory contains integration tests for the ethui Tauri application. The tests use WebDriver to launch the actual application and perform real user interactions.

## Overview

The integration tests are designed to:
- Launch the actual ethui Tauri application in test mode
- Navigate through the UI using WebDriver automation
- Verify core functionality like navigation and version display  
- Capture screenshots for debugging and verification
- Run both locally and in CI/CD environments

## Architecture

### Components

1. **TauriAppHandle** (`integration_test.rs`): Main test harness that manages:
   - Launching tauri-driver for WebDriver protocol
   - Starting the ethui Tauri application
   - Providing WebDriver utilities for UI interaction
   - Cleanup of processes and temporary data

2. **Test Configuration** (`tauri.test.conf.json`): Tauri-specific config for testing:
   - Disables production features like updater and analytics
   - Sets up appropriate CSP for test environment
   - Configures window size and behavior for automation

3. **Test Runner** (`scripts/run-integration-tests.sh`): Shell script that:
   - Checks and installs prerequisites
   - Sets up test environment variables
   - Manages process lifecycle
   - Provides colored output and error handling

4. **CI Workflow** (`.github/workflows/integration-tests.yml`): GitHub Actions workflow:
   - Installs system dependencies (WebKit, Chrome, ChromeDriver)
   - Sets up virtual display for headless testing
   - Runs tests and captures artifacts on failure

## Prerequisites

### Local Development

1. **Rust toolchain** with Tauri CLI:
   ```bash
   cargo install tauri-cli@^2.0
   ```

2. **tauri-driver** for WebDriver support:
   ```bash
   cargo install --git https://github.com/tauri-apps/tauri-driver
   ```

3. **pnpm** for frontend dependencies:
   ```bash
   npm install -g pnpm
   ```

4. **System dependencies** (Linux):
   ```bash
   sudo apt-get install -y \
     libwebkit2gtk-4.1-dev \
     libgtk-3-dev \
     libayatana-appindicator3-dev \
     librsvg2-dev \
     xvfb
   ```

### CI Environment

The GitHub Actions workflow automatically installs:
- Chrome browser and ChromeDriver
- tauri-driver
- Virtual display (Xvfb) for headless operation
- All system dependencies

## Running Tests

### Local Execution

1. **Quick run** using the test script:
   ```bash
   ./scripts/run-integration-tests.sh
   ```

2. **Manual execution** with more control:
   ```bash
   # Install dependencies
   pnpm install
   
   # Build frontend
   pnpm --filter @ethui/gui build
   
   # Set environment variables
   export ETHUI_CONFIG_DIR="./test-data"
   export ETHUI_TEST_MODE="1" 
   export TAURI_CONFIG="tauri.test.conf.json"
   
   # Start tauri-driver
   tauri-driver &
   DRIVER_PID=$!
   
   # Run tests
   cd bin && cargo test --test integration_test -- --nocapture
   
   # Cleanup
   kill $DRIVER_PID
   ```

3. **Debug mode** with verbose output:
   ```bash
   cd bin
   RUST_LOG=debug cargo test --test integration_test -- --nocapture
   ```

### CI Execution

Tests run automatically on:
- Push to `main` branch
- Pull requests to `main` branch
- Manual workflow dispatch

## Test Structure

### Current Tests

1. **test_app_launch_and_navigation**: 
   - Verifies application launches successfully
   - Navigates to Settings → About page
   - Attempts to verify version display
   - Captures screenshots at each step

2. **test_basic_navigation**:
   - Tests navigation to multiple routes
   - Verifies page loads without errors
   - Captures navigation screenshots

### Test Data Management

- **Isolated environment**: Each test run uses temporary directories
- **Clean state**: Fresh application state for each test
- **Screenshots**: Automatically captured for debugging
  - Success screenshots in `screenshots/` directory
  - Uploaded as CI artifacts on test failures

### Error Handling

- **Graceful degradation**: Tests continue even if some verifications fail
- **Detailed logging**: Console output shows test progress and issues
- **Screenshot capture**: Visual debugging for failed tests
- **Process cleanup**: Automatic cleanup of background processes

## Configuration

### Environment Variables

- `ETHUI_CONFIG_DIR`: Directory for test configuration and data
- `ETHUI_TEST_MODE`: Enables test-specific behavior
- `TAURI_CONFIG`: Path to test-specific Tauri configuration
- `DISPLAY`: X11 display for Linux environments (CI)

### Test Configuration Files

1. **tauri.test.conf.json**: Tauri app configuration for testing
2. **Cargo-test.toml**: Additional test dependencies
3. **integration_test.rs**: Main test implementation

## Extending Tests

### Adding New Test Cases

1. **Create test function** in `integration_test.rs`:
   ```rust
   #[tokio::test]
   #[serial]
   async fn test_new_feature() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
       let app = TauriAppHandle::start().await?;
       
       // Your test logic here
       app.navigate_to_route("/your/route").await?;
       app.click_element("[data-testid='your-element']").await?;
       
       // Verify results
       let text = app.get_text(".result").await?;
       assert!(text.contains("expected"));
       
       Ok(())
   }
   ```

2. **Add helper methods** to `TauriAppHandle`:
   ```rust
   impl TauriAppHandle {
       pub async fn your_helper_method(&self) -> Result<(), WebDriverError> {
           // Reusable test logic
           Ok(())
       }
   }
   ```

### Best Practices

1. **Use data-testid attributes** in React components for reliable element selection
2. **Implement proper waits** instead of fixed delays
3. **Take screenshots** at key points for debugging
4. **Use serial execution** (`#[serial]`) to avoid test conflicts
5. **Handle errors gracefully** with proper error propagation
6. **Clean up resources** in Drop implementations

### Debugging Failed Tests

1. **Check screenshots** in `screenshots/` directory
2. **Review console output** for error messages and timing
3. **Verify prerequisites** are installed correctly
4. **Test individual components** by adding granular assertions
5. **Run with debug logging** (`RUST_LOG=debug`)

## Future Enhancements

### Planned Features

1. **Cross-platform testing**: macOS and Windows support
2. **Wallet interaction tests**: Create, import, and manage wallets
3. **Transaction flow tests**: Send transactions and verify status
4. **Settings persistence tests**: Verify configuration saves correctly
5. **Network switching tests**: Test different blockchain networks
6. **Contract interaction tests**: Deploy and interact with smart contracts

### Performance Improvements

1. **Parallel test execution**: Run independent tests concurrently
2. **Test data fixtures**: Pre-configured test scenarios
3. **Mocked backends**: Reduce dependency on external services
4. **Snapshot testing**: Compare UI states over time

## Troubleshooting

### Common Issues

1. **tauri-driver not found**:
   ```bash
   cargo install --git https://github.com/tauri-apps/tauri-driver
   ```

2. **Frontend build failures**:
   ```bash
   pnpm install
   pnpm --filter @ethui/gui build
   ```

3. **WebDriver connection timeout**:
   - Ensure tauri-driver is running: `ps aux | grep tauri-driver`
   - Check if port 4444 is available: `netstat -tulpn | grep 4444`
   - Increase connection timeout in test code

4. **Application doesn't start**:
   - Verify system dependencies are installed
   - Check DISPLAY environment variable on Linux
   - Review application logs for startup errors

5. **Element not found errors**:
   - Add explicit waits for dynamic content
   - Verify CSS selectors match actual DOM structure
   - Use browser dev tools to inspect elements

### Getting Help

- Check existing GitHub issues for similar problems
- Review CI logs for detailed error information
- Enable debug logging for more verbose output
- Capture and analyze screenshots from failed tests

## Contributing

When adding new tests:

1. Follow the existing code structure and patterns
2. Add comprehensive error handling and logging
3. Include screenshot capture for debugging
4. Update this documentation with new test cases
5. Ensure tests work both locally and in CI

The integration test suite is a critical part of ensuring ethui's reliability and user experience. Well-written tests help catch regressions early and provide confidence in new features.