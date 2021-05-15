import { ApolloServer } from "apollo-server-express";
import { Express } from "express";
import { RedisPubSub } from "graphql-redis-subscriptions";
import { graphqlUploadExpress } from "graphql-upload";
import Redis from "ioredis";
import { buildSchemaSync } from "type-graphql";

import { Container } from "typedi";
import Config from "utils/config";

export async function gql(app: Express): Promise<void> {
  const configService = Container.get(Config);
  const { redis } = configService.get();

  const options: Redis.RedisOptions = {
    host: redis.host,
    port: redis.port,
    retryStrategy: (times) => Math.max(times * 100, 3000),
  };

  const pubSub = new RedisPubSub({
    publisher: new Redis(options),
    subscriber: new Redis(options),
  });

  const schema = buildSchemaSync({
    resolvers: [__dirname + "/resolver/**/*.resolver.{js,ts}"],
    authChecker: (params) => {
      const { context, info } = params;

      if (context.user == null) {
        return false;
      }

      if (info.fieldName === "me") {
        return true;
      }

      return context.user.verified;
    },
    container: Container,
    pubSub,
  });

  const server = new ApolloServer({
    schema,
    playground: false,
    uploads: false,
    context: async (ctx) => {
      const { req, ...rest } = ctx;
      return {
        user: req.user,
        req,
        ...rest,
      };
    },
  });
  app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));
  server.applyMiddleware({ app });
}
