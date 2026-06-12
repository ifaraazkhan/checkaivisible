import { Hono } from "hono";

export const leaderboard = new Hono();

leaderboard.get("/:city/restaurants", async (c) => {
  const city = c.req.param("city");
  // TODO (week 2): SELECT ... FROM leaderboard_rank JOIN businesses WHERE city = $1 ORDER BY rank LIMIT 200
  return c.json({ city, businesses: [], status: "not_implemented" }, 501);
});

leaderboard.get("/:city/restaurants/:slug", async (c) => {
  const city = c.req.param("city");
  const slug = c.req.param("slug");
  // TODO (week 2): fetch business + most recent audit results
  return c.json({ city, slug, status: "not_implemented" }, 501);
});
