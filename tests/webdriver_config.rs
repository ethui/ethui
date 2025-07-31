/// WebDriver configuration and utilities for integration testing
/// 
/// This module provides helper functions and configuration for setting up
/// WebDriver-based integration tests for the ethui Tauri application.

use std::time::Duration;

/// WebDriver configuration for ethui integration tests
#[derive(Debug, Clone)]
pub struct WebDriverConfig {
    pub webdriver_url: String,
    pub app_url: String,
    pub timeout: Duration,
    pub headless: bool,
}

impl Default for WebDriverConfig {
    fn default() -> Self {
        Self {
            webdriver_url: std::env::var("WEBDRIVER_URL")
                .unwrap_or_else(|_| "http://localhost:4444".to_string()),
            app_url: std::env::var("APP_URL")
                .unwrap_or_else(|_| "http://localhost:1420".to_string()),
            timeout: Duration::from_secs(30),
            headless: std::env::var("CI").is_ok(),
        }
    }
}

/// Navigation paths used in ethui app
pub struct AppPaths;

impl AppPaths {
    pub const HOME: &'static str = "/home";
    pub const SETTINGS: &'static str = "/home/settings";
    pub const SETTINGS_ABOUT: &'static str = "/home/settings/about";
    pub const SETTINGS_GENERAL: &'static str = "/home/settings/general";
    pub const SETTINGS_WALLETS: &'static str = "/home/settings/wallets";
    pub const SETTINGS_NETWORKS: &'static str = "/home/settings/networks";
}

/// CSS selectors for UI elements in ethui
pub struct Selectors;

impl Selectors {
    // Main navigation elements
    pub const SIDEBAR: &'static str = "[data-sidebar='sidebar']";
    pub const SETTINGS_BUTTON: &'static str = "button:has-text('Settings')";
    pub const SETTINGS_COLLAPSIBLE: &'static str = "[data-state='open'] a[href*='settings']";
    
    // Settings navigation
    pub const ABOUT_LINK: &'static str = "a[href='/home/settings/about']";
    pub const GENERAL_LINK: &'static str = "a[href='/home/settings/general']";
    
    // Content elements
    pub const VERSION_DISPLAY: &'static str = "li:has-text('ethui')";
    pub const APP_MAIN: &'static str = "main";
}

/// Test utilities for WebDriver integration tests
pub struct TestUtils;

impl TestUtils {
    /// Extracts version number from "ethui X.Y.Z" format
    pub fn extract_version_from_text(text: &str) -> Option<String> {
        if let Some(stripped) = text.strip_prefix("ethui ") {
            Some(stripped.trim().to_string())
        } else {
            None
        }
    }
    
    /// Validates semantic version format (X.Y.Z)
    pub fn is_valid_semver(version: &str) -> bool {
        let parts: Vec<&str> = version.split('.').collect();
        if parts.len() != 3 {
            return false;
        }
        
        parts.iter().all(|part| part.parse::<u32>().is_ok())
    }
    
    /// Constructs full URL from app base URL and path
    pub fn build_url(base_url: &str, path: &str) -> String {
        format!("{}{}", base_url.trim_end_matches('/'), path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_version_extraction() {
        assert_eq!(
            TestUtils::extract_version_from_text("ethui 1.21.1"),
            Some("1.21.1".to_string())
        );
        assert_eq!(
            TestUtils::extract_version_from_text("ethui 0.1.0"),
            Some("0.1.0".to_string())
        );
        assert_eq!(TestUtils::extract_version_from_text("not a version"), None);
        assert_eq!(TestUtils::extract_version_from_text(""), None);
    }

    #[test]
    fn test_semver_validation() {
        assert!(TestUtils::is_valid_semver("1.21.1"));
        assert!(TestUtils::is_valid_semver("0.1.0"));
        assert!(TestUtils::is_valid_semver("10.20.30"));
        
        assert!(!TestUtils::is_valid_semver("1.2"));
        assert!(!TestUtils::is_valid_semver("1.2.3.4"));
        assert!(!TestUtils::is_valid_semver("a.b.c"));
        assert!(!TestUtils::is_valid_semver(""));
    }

    #[test]
    fn test_url_building() {
        assert_eq!(
            TestUtils::build_url("http://localhost:1420", "/home/settings/about"),
            "http://localhost:1420/home/settings/about"
        );
        assert_eq!(
            TestUtils::build_url("http://localhost:1420/", "/home/settings/about"),
            "http://localhost:1420/home/settings/about"
        );
    }

    #[test]
    fn test_config_defaults() {
        let config = WebDriverConfig::default();
        assert_eq!(config.timeout, Duration::from_secs(30));
        assert!(config.webdriver_url.contains("localhost"));
        assert!(config.app_url.contains("localhost"));
    }
}