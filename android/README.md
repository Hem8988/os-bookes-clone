# DeskShark Delivery — Android app (Trusted Web Activity)

The delivery PWA (`/delivery`) is wrapped as an Android app so delivery boys
get a real installed app with reliable camera, GPS and fingerprint / face
login (SRS §14.3). The app is a thin shell; all logic stays in the web app.

## Build the APK / AAB

Requires Node, JDK 17 and the Android SDK (Bubblewrap can install both).

```bash
npm i -g @bubblewrap/cli
cd android
# 1. Put your live domain in twa-manifest.json (host, iconUrl, maskableIconUrl, webManifestUrl)
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.json   # or reuse twa-manifest.json
bubblewrap build                                                 # creates app-release-signed.apk / .aab
```

Keep `deskshark-release.keystore` and its passwords safe (it is git-ignored);
every update must be signed with the same key.

## Link the app to the website

```bash
keytool -list -v -keystore deskshark-release.keystore -alias deskshark   # copy the SHA-256 line
```

Set on the server and redeploy:

```
ANDROID_TWA_PACKAGE=com.deskshark.delivery
ANDROID_TWA_SHA256=AA:BB:…            # add the Play App Signing key too if you use Play Store
APP_URL=https://YOUR-DOMAIN            # must match the domain, biometric login depends on it
```

Check `https://YOUR-DOMAIN/.well-known/assetlinks.json` returns your package.
Without it, the app still works but shows a browser address bar.

## Distribute

Install the signed APK on the company phones (or publish the AAB on Play Store
as an internal/closed track). On first login each phone appears in
**Admin → Devices** for approval (device binding), then the delivery boy
registers fingerprint / face if enabled in **Settings → Security policy**.
