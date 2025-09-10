import { FastifyInstance, FastifyPluginOptions } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase";

const MealSchema = z.object({
  userId: z.string().uuid(),
  name: z.string().min(1),
  calories: z.number().int().nonnegative(),
  protein: z.number().int().nonnegative(),
  carbs: z.number().int().nonnegative(),
  fat: z.number().int().nonnegative(),
  notedAt: z.string().datetime().optional()
});

export async function mealsRoutes(app: FastifyInstance, _opts: FastifyPluginOptions) {
  // Create meal
  app.post("/meals", async (req, reply) => {
    const parse = MealSchema.safeParse(req.body);
    if (!parse.success) {
      return reply.code(400).send({ error: parse.error.flatten() });
    }
    const m = parse.data;
    const { error, data } = await supabaseAdmin
      .from("meal_logs")
      .insert({
        user_id: m.userId,
        name: m.name,
        calories: m.calories,
        protein_g: m.protein,
        carbs_g: m.carbs,
        fat_g: m.fat,
        noted_at: m.notedAt ?? new Date().toISOString()
      })
      .select()
      .single();

    if (error) return reply.code(500).send({ error: error.message });
    return { meal: data };
  });

  // Get meals for a user (today by default)
  app.get("/meals", async (req, reply) => {
    const q = req.query as { userId?: string; from?: string; to?: string };
    if (!q.userId) return reply.code(400).send({ error: "userId required" });

    let sel = supabaseAdmin
      .from("meal_logs")
      .select("*")
      .eq("user_id", q.userId)
      .order("noted_at", { ascending: false });

    if (q.from) sel = sel.gte("noted_at", q.from);
    if (q.to) sel = sel.lte("noted_at", q.to);

    const { data, error } = await sel;
    if (error) return reply.code(500).send({ error: error.message });

    // compute totals for convenience
    const totals = (data ?? []).reduce(
      (acc, m) => {
        acc.calories += m.calories || 0;
        acc.protein += m.protein_g || 0;
        acc.carbs += m.carbs_g || 0;
        acc.fat += m.fat_g || 0;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return { meals: data, totals };
  });
}
