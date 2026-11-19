import { searchSuggestions } from "@/lib/queries";

// Live suggestions for the search box: /api/search?q=...
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 80);
  const data = q.trim().length >= 2 ? await searchSuggestions(q) : { links: [], products: [] };
  return Response.json(
    data,
    { headers: { "Cache-Control": "public, max-age=60", "X-Robots-Tag": "noindex" } },
  );
}
