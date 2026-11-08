# Margin Connect — iPhone and Android

## Current status

Capacitor dependencies and packaging configuration are present. Release builds load the bundled `dist` assets, not the Lovable preview. Existing email/password sign-in and Connect data are reused.

This is packaging preparation, not a submitted or device-tested app. No iOS or Android projects, native push notifications, signing certificates or store listings have been created here. A native wrapper alone does not guarantee store approval or a Privyr-quality phone experience.

## Local setup

Connect/export this project to your GitHub repository and download its latest source first. Install Node.js compatible with Capacitor 8, Xcode on a Mac for iOS, and Android Studio for Android.

```sh
npm install
npx cap add ios
npx cap add android
npx cap update ios
npx cap update android
npm run build
npx cap sync
npx cap run ios
npx cap run android
```

Add each platform only once; run only the commands for platforms you need. Capacitor is already initialized, so do not run `cap init` again or replace the existing app identifier.

After every update, get the latest source from the connected repository, run `npm install` if dependencies changed, then `npm run build` and `npx cap sync` before running the device app.

## Optional development preview

For temporary device live reload on macOS/Linux:

```sh
CAPACITOR_LIVE_RELOAD=true npx cap sync
```

For a release, unset `CAPACITOR_LIVE_RELOAD`, rebuild and run `npx cap sync` again. Never submit native projects still configured to load the development preview.

## Release checklist

- Create Apple Developer and Google Play Console accounts in the intended publisher's name; provider fees apply.
- Generate native projects locally; configure signing, version numbers, final icons and launch screens.
- Verify login, logout, password recovery, leads, contact actions, attachments and downloads on real iPhone/Android devices.
- Review layouts, keyboard behavior, safe areas and Android back navigation; the current desktop layout needs a separate mobile usability pass.
- Configure and test native return links for password recovery and any enabled external sign-in before release; web redirects are not proof of native compatibility.
- Native push alerts are a separate integration and have not been added; existing Twilio SMS alerts remain separate.
- Prepare privacy policy, support URL, store screenshots, data/privacy declarations and reviewer access. Review account-deletion requirements and implement any required flow before submission.
- Produce signed iOS/Android releases, test through TestFlight/Play testing and submit for store review. Store approval is controlled by Apple and Google.

Lovable's mobile-app blog explains its own mobile builder app, not publication of this CRM: https://lovable.dev/blog/mobile-app. For this project's packaging, also consult https://capacitorjs.com/docs.