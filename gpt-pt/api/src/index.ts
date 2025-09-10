import Fastify from "fastify";
import cors from "@fastify/cors";
import { verifyAuth } from "./auth";
import { pg } from "./db";
import chatRoutes from "./routes/chat";
import mealRoutes from "./routes/meals";
import workoutRoutes from "./routes/workouts";

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

app.get("/health", async () => ({ ok: true }));

// Auth gate + ensure user row exists
app.addHook("preHandler", async (req, reply) => {
  if (req.url === "/health") return;
  const auth = await verifyAuth(req.headers.authorization);
  if (!auth) return reply.code(401).send({ error: "Unauthorized" });
  // upsert user
  await pg(
    `insert into public.users(id,email) values($1,$2)
     on conflict (id) do update set email=excluded.email`,
    [auth.user_id, auth.email ?? null]
  );
  (req as any).auth = auth;
});

app.get("/me", async (req, reply) => {
  const { user_id } = (req as any).auth;
  const { rows } = await pg("select id,email,created_at from public.users where id=$1",[user_id]);
  reply.send(rows[0] || null);
});

app.register(chatRoutes, { prefix: "/chat" });
app.register(mealRoutes, { prefix: "/meals" });
app.register(workoutRoutes, { prefix: "/workouts" });

const PORT = Number(process.env.PORT || 3001);
app.listen({ port: PORT, host: "0.0.0.0" })
  .then(() => app.log.info(`API on http://localhost:${PORT}`))
  .catch((e) => { app.log.error(e); process.exit(1); });
