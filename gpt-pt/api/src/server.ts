import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

// ---------------------------
// in-memory “DB” to prove flow
// ---------------------------
type Meal = {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  noted_at: string;
};
type Workout = { id: string; day: number; note: string; created_at: string };

const MEALS: Meal[] = [];
const WORKOUTS: Workout[] = [];

function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, {
    origin: true,
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  // health
  app.get("/health", async () => ({ ok: true }));

  // ========= MEALS =========
  app.get("/meals/logs", async () => {
    const totals = MEALS.reduce(
      (t, m) => {
        t.calories += m.calories || 0;
        t.protein_g += m.protein_g || 0;
        t.carbs_g += m.carbs_g || 0;
        t.fat_g += m.fat_g || 0;
        return t;
      },
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    return { items: MEALS.slice().reverse(), totals };
  });

  app.post("/meals/logs", async (req, reply) => {
    const b = (req.body as any) || {};
    if (!b.name) return reply.code(400).send({ error: "name required" });
    const meal: Meal = {
      id: String(Date.now()),
      name: String(b.name),
      calories: Number(b.calories || 0),
      protein_g: Number(b.protein_g || 0),
      carbs_g: Number(b.carbs_g || 0),
      fat_g: Number(b.fat_g || 0),
      noted_at: new Date().toISOString(),
    };
    MEALS.push(meal);
    return { ok: true, item: meal };
  });

  // ======== WORKOUTS ========
  app.get("/workouts/logs", async () => {
    return { items: WORKOUTS.slice().reverse() };
  });

  app.post("/workouts/logs", async (req, reply) => {
    const b = (req.body as any) || {};
    if (!b.note || !String(b.note).trim())
      return reply.code(400).send({ error: "note required" });
    const w: Workout = {
      id: String(Date.now()),
      day: Number(b.day || 1),
      note: String(b.note),
      created_at: new Date().toISOString(),
    };
    WORKOUTS.push(w);
    return { ok: true, item: w };
  });

  // ========= CHAT =========
  app.post("/chat", async (req, reply) => {
    const b = (req.body as any) || {};
    const msg = (b.message ?? "").toString().trim();
    if (!msg) return reply.code(400).send({ error: "message required" });
    return { reply: `Coach: I hear "${msg}". Let's keep it simple and consistent.` };
  });

  return app;
}

async function main() {
  const app = buildServer();
  const PORT = Number(process.env.PORT || 5757);
  try {
    await app.listen({ host: "0.0.0.0", port: PORT });
    console.log(`🚀 API running at http://127.0.0.1:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}
main();
