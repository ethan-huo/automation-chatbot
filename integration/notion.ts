import { env } from "@/lib/env";
import { Client } from "@notionhq/client";

export const notionClient = new Client({
	auth: env.NOTION_TOKEN,
});
