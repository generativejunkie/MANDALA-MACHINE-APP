# Antigravity Approval App (iOS)

This is the core source code for the Antigravity Central Command iOS application, designed for iPad and iPhone. It allows for the monitoring of Generative Machine projects and direct approval of system requests.

## Architecture
- **Framework**: SwiftUI
- **Language**: Swift 5.10+
- **Platform**: iOS 17.0+
- **Aesthetic**: Calculated Resonance (Dark Mode, Glassmorphism, Neon Glow)

## Project Structure
- `Sources/AntigravityApp.swift`: App entry point.
- `Sources/Models/Models.swift`: Data structures for Projects and Approvals.
- `Sources/Styles/Styles.swift`: Design system and UI utilities.
- `Sources/Views/ContentView.swift`: Main Dashboard and Navigation.
- `Sources/Views/ListFlows.swift`: Project Archive and Approval list.

## How to Set Up in Xcode
1. Open **Xcode**.
2. Create a new **SwiftUI Project** named `AntigravityApproval`.
3. Drag and drop the files from the `antigravity-ios/Sources` directory into your Xcode project.
4. Ensure the **Deployment Target** is set to **iOS 17.0** or later.
5. Set the **Preferred Color Scheme** to **Dark** in the Info.plist or use the `.preferredColorScheme(.dark)` modifier on the root view.
6. Build and Run.

## AI Handshake
The app is designed to synchronize with the `GENERATIVE MACHINE` local server logs. For production use, replace `MockData` with real network calls to your local IP (`192.168.11.41:8000`).
