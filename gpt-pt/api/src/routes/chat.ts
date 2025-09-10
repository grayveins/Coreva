import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import OpenAI from "openai";
import { pg } from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ChatSchema = z.object({ text: z.string().min(1) });

const routes: FastifyPluginAsync = async (app) => {
  app.get("/history", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const { rows } = await pg(
      "select role, content, created_at from public.messages where user_id=$1 order by created_at asc limit 50",
      [user_id]
    );
    reply.send(rows);
  });

  app.post("/", async (req, reply) => {
    const { user_id } = (req as any).auth;
    const { text } = ChatSchema.parse(req.body);

    await pg("insert into public.messages(user_id,role,content) values($1,'user',$2)", [user_id, text]);

    const { rows: hist } = await pg(
      "select role, content from public.messages where user_id=$1 order by created_at asc limit 20",
      [user_id]
    );

    const messages = [
      { role: "system", content: "You are 'Fit AI Coach'—concise, friendly, injury-aware. Use simple progressions and macros in grams." },
      ...hist.map(r => ({ role: r.role as "user"|"assistant", content: r.content as string }))
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[];

    const comp = await openai.chat.completions.create({ model: MODEL, messages, temperature: 0.4 });
    const replyText = comp.choices[0]?.message?.content || "Sorry, I couldn't generate a reply.";

    await pg("insert into public.messages(user_id,role,content) values($1,'assistant',$2)", [user_id, replyText]);

    reply.send({ reply: replyText });
  });
};

export default routes;
