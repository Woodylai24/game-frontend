import GamePageClient from "./GamePageClient";

// Static export with `output: 'export'` requires generateStaticParams to return
// at least one param (an empty array fails the build — see vercel/next.js#58171).
// The placeholder emits a single harmless /game/_/index.html (just another copy
// of the SPA shell). Real session IDs are resolved client-side at runtime:
// deep links like /game/123 return 404 from S3, CloudFront serves index.html,
// and the Next.js client router renders the page from the URL param.
export async function generateStaticParams() {
  return [{ sessionId: "_" }];
}

export default function GamePage() {
  return <GamePageClient />;
}
