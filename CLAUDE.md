# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/browser extension called "Oprosnik Helper" that assists with filling out surveys by automatically copying data from Cisco Finesse. The extension is designed for internal use at RT (Rostelecom) and integrates with their CTP survey system.

The project is written in **TypeScript** and uses **React** for the popup UI. It is bundled using **Webpack**.

## Architecture

The extension follows a modern Manifest V3 architecture with a modular, event-driven design.

### File Structure

The source code is located in the `oprosnik-extension/src/` directory.

- `oprosnik-extension/src/`: Main source directory.
  - `background/`: Logic for the background service worker.
    - `index.ts`: Main entry point, initializes and connects modules.
    - `FinesseMonitor.ts`: Class responsible for monitoring the Finesse tab.
    - `CallStorage.ts`: Class for managing call history in `chrome.storage`.
    - `EventBus.ts`: A simple event bus for intra-script communication.
    - `scraper.ts`: Functions that are injected into the Finesse page to extract data.
  - `popup/`: The React-based popup application.
    - `index.tsx`: Renders the React application.
    - `Popup.tsx`: The main React component for the popup UI.
    - `components/`: Directory for smaller, reusable React components.
    - `hooks/`: Directory for custom React hooks (e.g., `useCallData.ts`).
  - `scripts/`: Content scripts that run on web pages.
    - `filler.ts`: Injects the "paste data" button on the survey page.
    - `form-modifier.ts`: Hides unnecessary form fields.
    - `parser.ts`: Runs on the Finesse page to assist the background script.
    - `sidebar-hider.ts`: Adds a button to hide the sidebar on the survey page.
  - `css/`: CSS files used by content scripts.
  - `types.ts`: Contains shared TypeScript type definitions (e.g., `CallData`).
  - `manifest.json`: The extension's manifest file.
  - `popup.html`: The HTML file for the popup window.
- `oprosnik-extension/icons/`: **(Outside of `src`)** Contains the extension's icons. This directory was left in its original location due to limitations with the file manipulation tools.

### Background Service Worker (`background/`)

The background service worker uses an event-driven architecture.
1.  **`index.ts`** initializes the `FinesseMonitor` and `CallStorage`.
2.  **`FinesseMonitor.ts`** finds the Finesse tab and uses `chrome.alarms` to periodically inject functions from **`scraper.ts`** to check the agent's status.
3.  When a call starts or ends, `FinesseMonitor` emits an event on the **`EventBus`**.
4.  An event listener in `index.ts` catches the `call:end` event and uses **`CallStorage.ts`** to save the call data to `chrome.storage.local`.

### Popup (`popup/`)

The popup is a **React** application written in **TypeScript**.
- It uses a custom hook, `useCallData`, to fetch call history and status from `chrome.storage.local` and automatically updates when the data changes.
- The UI is broken down into small, reusable components found in the `popup/components/` directory.

### Content Scripts (`scripts/`)

The content scripts are written in TypeScript and are responsible for interacting with the web pages. They are defined in the `manifest.json` and bundled by Webpack.

## Development

This project uses `npm` for dependency management and `webpack` for bundling.

1.  **Install Dependencies**:
    ```bash
    npm install
    ```
2.  **Run Development Build**: For development with auto-recompilation.
    ```bash
    npm run dev
    ```
3.  **Run Production Build**: To create an optimized build for deployment.
    ```bash
    npm run build
    ```
The final, packaged extension will be located in the `dist/` directory.

## Testing the Extension
1.  Run `npm run build`.
2.  Load the `dist` directory as an unpacked extension in Chrome's developer mode (`chrome://extensions`).
3.  Navigate to the Finesse URL to activate monitoring.
4.  Navigate to the CTP survey URL to test form modifications and data insertion.
5.  Check the browser console and the extension's service worker console for detailed logging.
6.  Use `debugOprosnikHelper()` function in the survey page console for diagnostics.
