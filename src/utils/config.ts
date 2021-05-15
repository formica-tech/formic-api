import * as path from "path";
import * as fs from "fs";
import { Service } from "typedi";
import * as z from "zod";

const AppConfig = z.object({
  address: z.string(),
  port: z.number(),
  key: z.object({ private: z.string(), public: z.string() }),
  smtp: z.object({
    host: z.string(),
    username: z.string(),
    password: z.string(),
    port: z.number(),
    secure: z.boolean(),
  }),
  redis: z.object({
    host: z.string(),
    port: z.number(),
  }),
  sql: z.object({
    host: z.string(),
    port: z.number(),
    username: z.string(),
    password: z.string(),
    database: z.string(),
  }),
  objectStorage: z.object({
    host: z.string(),
    port: z.number(),
    accessKey: z.string(),
    secretKey: z.string(),
  }),
});

export type AppConfig = z.infer<typeof AppConfig>;

@Service()
class Config {
  private readonly config: AppConfig;

  get(): AppConfig {
    return this.config;
  }

  constructor() {
    const confPath =
      process.env.APP_CONFIG_PATH ||
      process.argv[2] ||
      path.join(process.cwd(), "config.json");

    const jsonConfig = JSON.parse(fs.readFileSync(confPath).toString());

    this.config = AppConfig.parse(jsonConfig);
  }
}

export default Config;
