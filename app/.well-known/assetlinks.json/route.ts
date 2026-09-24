// Digital Asset Links for the Android Trusted Web Activity (SRS §14.3).
// Proves to Android that the DeskShark app package may open this site
// full-screen (no browser bar) with camera, location and biometric access.
//   ANDROID_TWA_PACKAGE        e.g. com.deskshark.delivery
//   ANDROID_TWA_SHA256         signing-key fingerprint(s), comma separated

export function GET() {
  const packageName = process.env.ANDROID_TWA_PACKAGE;
  const fingerprints = (process.env.ANDROID_TWA_SHA256 || '')
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  const statements =
    packageName && fingerprints.length
      ? [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: { namespace: 'android_app', package_name: packageName, sha256_cert_fingerprints: fingerprints },
          },
        ]
      : [];
  return Response.json(statements, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
