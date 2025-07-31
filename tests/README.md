# Integration Tests for ethui

This directory contains integration tests for the ethui Tauri application, following the testing guidelines from [Tauri v2 documentation](https://v2.tauri.app/develop/tests/).

## Overview

The integration test suite verifies:
- App startup and initialization 
- Navigation between different sections (Settings > About)
- Version display and verification
- UI interactions and responsiveness

## Test Structure

```
tests/
├── README.md                 # This documentation
├── integration_test.rs       # Main integration test suite
├── webdriver_config.rs       # WebDriver configuration and utilities
└── (future: webdriver_test.rs) # Full WebDriver implementation
```

## Running Tests

### Prerequisites

1. **System Dependencies** (Linux/Ubuntu):
   ```bash
   sudo apt-get install -y \
     build-essential curl wget file \
     libssl-dev libayatana-appindicator3-dev \
     librsvg2-dev libwebkit2gtk-4.1-dev \
     libjavascriptcoregtk-4.1-dev libsoup-3.0-dev \
     patchelf libsodium-dev xvfb
   ```

2. **Frontend Build**:
   ```bash
   cd gui && pnpm install && pnpm build
   ```

### Local Testing

Run the basic integration tests:
```bash
cargo test --test integration_test
```

Run with verbose output:
```bash
cargo test --test integration_test --verbose
```

### CI/GitHub Actions

The integration tests run automatically on:
- Push to `main` branch
- Pull requests (opened, synchronized, reopened)

See `.github/workflows/integration-tests.yml` for the complete CI configuration.

## Test Implementation

### Current Implementation

The current tests provide:
- ✅ Test infrastructure setup and validation
- ✅ Version format verification utilities
- ✅ Navigation path definitions
- ✅ CSS selector utilities for UI elements
- ✅ GitHub Actions workflow

### Future WebDriver Implementation

The infrastructure is prepared for full WebDriver testing that will:
- Start the ethui app in test mode
- Use ChromeDriver for browser automation
- Navigate through the UI programmatically
- Verify version display in the About page
- Test complete user workflows

## Configuration

### Environment Variables

- `WEBDRIVER_URL`: WebDriver server URL (default: `http://localhost:4444`)
- `APP_URL`: ethui app URL (default: `http://localhost:1420`)
- `CI`: Set to skip certain tests in CI environments
- `RUST_LOG`: Logging level for tests

### Test Paths

The tests navigate to these specific routes:
- `/home` - Home page
- `/home/settings` - Settings section
- `/home/settings/about` - About page (target for version verification)

## UI Elements

### Navigation
- Settings button in sidebar (collapsible)
- About link in settings submenu

### Content Verification
- Version display: `<li>ethui {version}</li>`
- Expected format: "ethui X.Y.Z" (semantic versioning)

## Adding New Tests

1. **Unit Tests**: Add to existing test modules in `integration_test.rs`
2. **Navigation Tests**: Extend the navigation test suite
3. **WebDriver Tests**: Implement in the future `webdriver_test.rs` file

### Example Test Structure

```rust
#[tokio::test]
async fn test_new_feature() -> Result<(), Box<dyn std::error::Error>> {
    // Setup
    let config = WebDriverConfig::default();
    
    // Test logic
    // ...
    
    // Assertions
    assert!(condition);
    
    Ok(())
}
```

## Troubleshooting

### Common Issues

1. **WebDriver not available**: Tests will skip gracefully in CI without WebDriver
2. **Frontend not built**: Run `cd gui && pnpm build` before testing
3. **Permission issues**: Ensure proper system dependencies are installed

### Debug Mode

Enable verbose logging:
```bash
RUST_LOG=debug cargo test --test integration_test
```

## Future Enhancements

- [ ] Complete WebDriver implementation
- [ ] Cross-platform testing (Windows, macOS)
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Mobile/responsive UI testing
- [ ] Accessibility testing