import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { pg } from "../db";

const CreateWorkout = z.object({ name: z.string().min(1), note: z.string().optional() });
const CreateWorkoutLog = z.object({
  workout_id: z.number().optional(),
  date: z.string().optional(), // YYYY-MM-DD
  exercise: z.string().min(1),
  sets: z.number().optional(),
  reps: z.number().optional(),
  weight: z.number().optional(),
  note: z.string().optional()
});

const routes: FastifyPluginAsync = async (app) => {
  app.get("/", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const { rows } = await pg("select * from public.workouts where user_id=$1 order by created_at desc", [user_id]);
    reply.send(rows);
  });

  app.post("/", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const b = CreateWorkout.parse(req.body);
    const { rows } = await pg(
      "insert into public.workouts(user_id,name,note) values($1,$2,$3) returning *",
      [user_id, b.name, b.note ?? null]
    );
    reply.send(rows[0]);
  });

  app.get("/logs", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const { rows } = await pg(
      "select * from public.workout_logs where user_id=$1 order by date desc, created_at desc limit 100",
      [user_id]
    );
    reply.send(rows);
  });

  app.post("/logs", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const b = CreateWorkoutLog.parse(req.body);
    const { rows } = await pg(
      `insert into public.workout_logs(user_id, workout_id, date, exercise, sets, reps, weight, note)
       values ($1,$2, coalesce($3::date, current_date), $4,$5,$6,$7,$8)
       returning *`,
      [user_id, b.workout_id ?? null, b.date ?? null, b.exercise, b.sets ?? null, b.reps ?? null, b.weight ?? null, b.note ?? null]
    );
    reply.send(rows[0]);
  });
};

export default routes;
