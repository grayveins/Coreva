import "dotenv/config"
import Fastify from "fastify";
import cors from "@fastify/cors";
import { mealsRoutes } from "./routes/meals";

const app = Fastify({ logger: true });

async function main() {
  await app.register(cors, { origin: "*" });

  app.get("/health", async () => ({ ok: true }));

  await app.register(mealsRoutes);

  const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API listening on http://127.0.0.1:${PORT}`);
}

main().catch((err) => {
  app.log.error(err);
  process.exit(1);
});

