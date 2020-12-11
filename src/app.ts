import "reflect-metadata";

import config from "config";
import { startGQLServer } from "gql/server";
import { Container } from "typedi";
import { createConnection, useContainer } from "typeorm";

async function main() {
  useContainer(Container);
  await createConnection();
  await startGQLServer(config.port);
}

main().catch(console.error);
