# Offline Android prototype

Download the ready-to-install APK from the repository's Releases page. Android 8.0+ with an up-to-date Android System WebView/Chrome is required. The game is bundled inside the app: no computer, server, accounts or internet connection are needed to play. No Android permissions are requested.

This is a debug-signed prototype for direct installation, not a Play Store release. Do not uninstall an older build to update unless Android reports an incompatible signature; future builds signed with a different debug key may require reinstalling. There is no saved game state in this prototype.

## Build from source

Use Node 22.12+, JDK 17 or 21, Android SDK platform 35 and build-tools 35.0.0. Set `ANDROID_HOME` to the SDK (or create untracked `android/local.properties` with `sdk.dir=/absolute/sdk/path`).

```sh
npm ci
npm run android:prepare
npx playwright install chromium
npm run android:verify
cd android
./gradlew assembleDebug lintDebug
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`. Gradle creates a local test signing key automatically. Signing keys, build output, SDK paths and generated game assets are ignored by Git. Always prepare the web bundle before rebuilding the APK.

## Implementation and verification

A native Java Activity hosts a hardware-accelerated WebView in immersive landscape. Its HTTPS origin is intercepted and served exclusively from packaged assets. Unknown origins/paths return 404; file/content access is disabled. A content security policy allows the local compiled game and inline styling without network access. There are no native JavaScript interfaces or third-party runtime dependencies.

Android Back opens/closes the game's pause menu. App pause/resume pauses WebView timers. Game state survives orientation changes within the current Activity, but not process termination. This prototype intentionally has no save system.

The offline verification script loads the exact packaged web bundle under its Android origin/CSP in touch-enabled Chromium and exercises autonomous combat, Formation shifts and encounter retry. APK build, Android lint, packaged assets and signing certificate are checked separately. These checks are not a physical Android device/runtime test.

## Build verification for v0.1.0-android

- Gradle `assembleDebug lintDebug`: successful; lint reports 0 errors and 3 warnings (fixed landscape orientation, intentionally enabled JavaScript, future backup-rule configuration). This is an offline, no-save game; no network content or native JS bridge is exposed.
- APK signature verified using Android build-tools `apksigner` (APK Signature Scheme v2).
- Manifest inspected: package `com.narmanb.ashglade.prototype`, minimum API 26, target API 35, no requested permissions.
- Compiled JS/CSS, entry page and WebView compatibility check verified inside the APK archive.
- 25 game simulation tests, 8 Chromium browser tests and offline packaged-assets smoke check pass.
- Independent native-shell review found an old-WebView compatibility problem. A checked compatibility entry page now explains how to update System WebView/Chrome before loading the game; its fallback and modern startup are tested.
- Physical Android installation, device performance, lifecycle and Back-button behavior have not been tested on a device/emulator.
