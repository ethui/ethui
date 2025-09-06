#!/bin/bash
set -e

echo "🚀 Starting ethui Integration Tests"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to cleanup processes
cleanup() {
    echo -e "${YELLOW}Cleaning up processes...${NC}"
    if [ ! -z "$DRIVER_PID" ]; then
        kill $DRIVER_PID 2>/dev/null || true
    fi
    # Kill any remaining tauri-driver or ethui processes
    pkill -f "tauri-driver" 2>/dev/null || true
    pkill -f "ethui" 2>/dev/null || true
}

# Set trap to cleanup on exit
trap cleanup EXIT

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if tauri-driver is installed
if ! command -v tauri-driver &> /dev/null; then
    echo -e "${RED}❌ tauri-driver not found. Installing...${NC}"
    cargo install --git https://github.com/tauri-apps/tauri-driver
fi

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Please install pnpm first.${NC}"
    exit 1
fi

# Check if frontend dependencies are installed
if [ ! -d "gui/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
    pnpm install
fi

# Create necessary directories
mkdir -p screenshots
mkdir -p test-data

# Set test environment variables
export ETHUI_CONFIG_DIR="./test-data"
export ETHUI_TEST_MODE="1"
export TAURI_CONFIG="tauri.test.conf.json"

echo -e "${GREEN}✅ Prerequisites checked${NC}"

# Start tauri-driver in background
echo "🎯 Starting tauri-driver..."
tauri-driver &
DRIVER_PID=$!

# Wait for driver to start
sleep 3

# Check if driver started successfully
if ! kill -0 $DRIVER_PID 2>/dev/null; then
    echo -e "${RED}❌ Failed to start tauri-driver${NC}"
    exit 1
fi

echo -e "${GREEN}✅ tauri-driver started (PID: $DRIVER_PID)${NC}"

# Build frontend
echo "🏗️  Building frontend..."
if ! pnpm --filter @ethui/gui build; then
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Frontend built successfully${NC}"

# Run integration tests
echo "🧪 Running integration tests..."
cd bin

if cargo test --test integration_test -- --nocapture; then
    echo -e "${GREEN}🎉 Integration tests passed!${NC}"
    exit_code=0
else
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit_code=1
fi

cd ..

# Show screenshots if any were created
if [ -d "screenshots" ] && [ "$(ls -A screenshots)" ]; then
    echo -e "${YELLOW}📸 Screenshots created:${NC}"
    ls -la screenshots/
fi

exit $exit_code