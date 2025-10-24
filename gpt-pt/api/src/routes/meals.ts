import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const InsertMeal = z.object({
  user_id: z.string().uuid(),
  name: z.string().min(1),
  calories: z.number().int().nonnegative(),
  protein_g: z.number().int().nonnegative(),
  carbs_g: z.number().int().nonnegative(),
  fat_g: z.number().int().nonnegative(),
  noted_at: z.string().optional(), // ISO string
});

export default async function mealsRoutes(app: FastifyInstance) {
  app.get("/meal-logs", async (req) => {
    const { user_id } = (req.query ?? {}) as { user_id?: string };
    if (!user_id) return { data: [], error: "user_id required" };

    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user_id)
      .order("noted_at", { ascending: false });

    if (error) throw error;
    return { data };
  });

  app.post("/meal-logs", async (req) => {
    const parsed = InsertMeal.parse(req.body);
    const { data, error } = await supabase
      .from("meal_logs")
      .insert(parsed)
      .select()
      .single();
    if (error) throw error;
    return { data };
  });
}
