import api from "api/api";
import express from "express";

import { gql } from "gql/gql";
import { RedisPubSub } from "graphql-redis-subscriptions";
import MinioStorage from "implementation/MinioStorage";
import NodeMailer from "implementation/NodeMailer";
import { Mailer } from "interface/Mailer";
import { ObjectStorage } from "interface/ObjectStorage";
import Redis from "ioredis";
import * as path from "path";
import "reflect-metadata";

import { Container } from "typedi";
import {
  createConnection,
  DefaultNamingStrategy,
  Table,
  useContainer,
} from "typeorm";
import Config, { AppEnv } from "service/config";

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

export interface App {
  listen: () => void;
  close: () => void;
}

export async function init(): Promise<App> {
  // choose the implementation.
  Container.set(ObjectStorage, Container.get(MinioStorage));
  Container.set(Mailer, Container.get(NodeMailer));

  useContainer(Container);
  const config = Container.get(Config);
  const { sql, port, env, redis } = config.get();
  if (env === AppEnv.DEV) process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  const sqlConn = await createConnection({
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

  const options: Redis.RedisOptions = {
    host: redis.host,
    port: redis.port,
    // username: redis.user,
    password: redis.password,
    retryStrategy: (times) => Math.max(times * 100, 3000),
  };

  const pubSub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  });

  const app = express();
  await api(app);
  await gql(app, pubSub);

  return {
    listen: () =>
      app.listen({ port }, () => {
        console.log(`Formic API available at http://localhost:${port}`);
      }),
    close: async () => {
      await Promise.all([sqlConn.close(), pubSub.close()]);
    },
  };
}
