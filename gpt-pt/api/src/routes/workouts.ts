import { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const InsertWorkoutLog = z.object({
  user_id: z.string().uuid(),
  note: z.string().min(1),
  day: z.number().int().min(1).max(7),
});

export default async function workoutsRoutes(app: FastifyInstance) {
  app.get("/workout-logs", async (req) => {
    const { user_id } = (req.query ?? {}) as { user_id?: string };
    if (!user_id) return { data: [], error: "user_id required" };

    const { data, error } = await supabase
      .from("workout_logs")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data };
  });

  app.post("/workout-logs", async (req) => {
    const parsed = InsertWorkoutLog.parse(req.body);
    const { data, error } = await supabase
      .from("workout_logs")
      .insert(parsed)
      .select()
      .single();
    if (error) throw error;
    return { data };
  });
}
