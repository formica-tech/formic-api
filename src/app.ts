import "reflect-metadata";
import express from "express";
import * as path from "path";

import { gql } from "gql/gql";
import api from "api/api";

import { Container } from "typedi";
import {
  createConnection,
  DefaultNamingStrategy,
  Table,
  useContainer,
} from "typeorm";
import Config from "utils/config";
import ObjectStorage from "utils/objectStorage";

class CustomNamingStrategy extends DefaultNamingStrategy {
  primaryKeyName(tableOrName: Table | string, columnNames: string[]): string {
    return [tableOrName, ...columnNames, "pk"].join("_");
  }

  uniqueConstraintName(
    tableOrName: Table | string,
    columnNames: string[]
  ): string {
    return [tableOrName, ...columnNames, "uq"].join("_");
  }

  foreignKeyName(
    tableOrName: Table | string,
    columnNames: string[],
    _referencedTablePath?: string,
    _referencedColumnNames: string[] = []
  ): string {
    return [
      tableOrName,
      ...columnNames,
      _referencedTablePath,
      ..._referencedColumnNames,
      "fk",
    ].join("_");
  }

  relationConstraintName(
    tableOrName: Table | string,
    columnNames: string[],
    where?: string
  ): string {
    return [tableOrName, ...columnNames, where, "rel"].join("_");
  }
}

async function main() {
  useContainer(Container);
  const config = Container.get(Config);
  const { sql, port } = config.get();
  await createConnection({
    type: "postgres",
    synchronize: true,
    logging: false,
    entities: [path.join(__dirname, "/entity/**/*.{js,ts}")],
    // TODO: setup migrations for ease of use
    // migrations: [],
    ...sql,
    namingStrategy: new CustomNamingStrategy(),
  });
  const objectStorage = Container.get(ObjectStorage);
  await objectStorage.init();

  const app = express();
  await api(app);
  await gql(app);
  app.listen({ port }, () => {
    console.log(`Formic API available at http://localhost:${port}`);
  });
}

main().catch(console.error);
