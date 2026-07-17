import RoomPageClient from "./RoomPageClient";

// Static export with `output: 'export'` requires generateStaticParams to return
// at least one param (an empty array fails the build — see vercel/next.js#58171).
// The placeholder emits a single harmless /room/_/index.html (just another copy
// of the SPA shell). Real room codes are resolved client-side at runtime:
// deep links like /room/ABC1 return 404 from S3, CloudFront serves index.html,
// and the Next.js client router renders the page from the URL param.
export async function generateStaticParams() {
  return [{ roomCode: "_" }];
}

export default function RoomPage() {
  return <RoomPageClient />;
}
