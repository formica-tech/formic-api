import "reflect-metadata";

import * as path from "path";
import { startGQLServer } from "gql/server";
import { Container } from "typedi";
import { createConnection, useContainer } from "typeorm";
import Config from "utils/config";

async function main() {
  useContainer(Container);
  const config = Container.get(Config);
  const { sql } = config.get();
  await createConnection({
    type: "postgres",
    synchronize: true,
    logging: false,
    entities: [path.join(__dirname, "/entity/**/*.{js,ts}")],
    // TODO: setup migrations for ease of use
    // migrations: [],
    ...sql,
  });
  await startGQLServer();
}

main().catch(console.error);
