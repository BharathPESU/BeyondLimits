# BeyondLimits Core Engineering & Delivery Protocol

Every agent working on this repository MUST strictly abide by the following 6-step engineering workflow for every task and prompt.

---

## 1. Think Like a Senior Engineer First (Reasoning Before Action)
- **Do NOT blindly execute prompts**: Stop and reason about what the user is asking. Understand the fundamental intent, root cause, and downstream impacts.
- **Investigate the environment and real APIs**: Never guess model names, API schemas, or SDK behavior. Inspect packages, query actual API catalogs, and verify environment keys before assuming how something works.
- **Analyze edge cases & constraints**: Consider mobile performance, rate limits (HTTP 429), audio playback policies (user gesture requirements), security boundaries, and offline/network resiliency.

---

## 2. Plan Correctly Before Touching Code
Before writing or modifying code:
- **Define What to Build**: Clear functional specification and UX behavior.
- **Identify Affected Files**: Explicit list of files that will be created, edited, or configured across frontend, backend API routes, Capacitor/Android, and databases.
- **Architectural Coherence**: Ensure the solution fits the existing design system, state persistence model, and auth flow (Clerk + WebAuthn).

---

## 3. Test & Verify the Application Comprehensively
Never declare a task complete without concrete, verified test output:
1. **TypeScript Typecheck**:
   ```bash
   npx tsc --noEmit
   ```
   Must pass with **0 errors**.
2. **Production Next.js Build**:
   ```bash
   npm run build
   ```
   Must compile all routes and static pages cleanly with **0 failures**.
3. **Runtime & Endpoint Verification**:
   Execute curl/node test requests against modified API endpoints to verify live status codes, latency, and data integrity.

---

## 4. Build the Required Native Android APK
Whenever mobile features, WebView settings, Capacitor configs, or core UI changes are made:
1. **Sync Capacitor**:
   ```bash
   npx cap copy android
   ```
2. **Ensure Assets are Lean**:
   Verify that `public/beyondlimits.apk` is not recursively copied into `android/app/src/main/assets/public/` to prevent APK size inflation.
3. **Compile Debug APK**:
   ```bash
   cd android && ./gradlew assembleDebug && cd ..
   ```
4. **Publish Updated APK**:
   Copy the fresh binary to `public/beyondlimits.apk`:
   ```bash
   cp -f android/app/build/outputs/apk/debug/app-debug.apk public/beyondlimits.apk
   ```

---

## 5. Push All Changes to GitHub
1. Stage all tracked and new files:
   ```bash
   git add .
   ```
2. Create an informative, structured commit message detailing fixes and features.
3. Push to GitHub:
   ```bash
   git push origin main
   ```

---

## 6. Deploy All Changes to Vercel Production
1. Deploy directly to Vercel production:
   ```bash
   export VERCEL_TOKEN=$(grep '^VERCEL_TOKEN=' .env.local | cut -d= -f2- | tr -d '"' | tr -d "'")
   NODE_OPTIONS="--require $(pwd)/scripts/dns-override.js" npx vercel deploy --prod --yes --token="$VERCEL_TOKEN"
   ```
2. Verify that the production URL (`https://project-vuxsx.vercel.app`) is healthy and aliased properly.
