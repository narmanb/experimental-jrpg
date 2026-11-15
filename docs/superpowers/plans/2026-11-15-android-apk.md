# Offline Android APK plan

Goal: give the user an installable APK and a direct download, with no computer/server needed to play.
Approach: a small native Android Activity hosts the existing production game in a WebView. All assets are packaged in the APK and served from an intercepted local HTTPS origin. No internet, storage, account or API permissions. Original browser version remains available.

- [x] Verify relative production assets work from a nested local origin in Chromium before adding the shell.
- [x] Build native Java/Gradle shell, immersive landscape, Android Back/menu behavior, and lifecycle handling.
- [x] Generate the Gradle wrapper; add repeatable build scripts and source instructions.
- [x] Compile and sign a debug/test APK; inspect packaged files, SDK compatibility, permissions and signature.
- [x] Run game tests and offline production smoke test; document limits (physical Android runtime untested).
- [x] Commit/push source and publish a clearly labeled test APK in GitHub Releases; supply direct download/install instructions.

A native rewrite would be unnecessary for this Canvas game; a hosted web wrapper would retain the connection/server requirement the user cannot use. The packaged offline shell is the implementation choice for the requested APK.
