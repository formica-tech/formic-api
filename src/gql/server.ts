import { ApolloServer } from "apollo-server";
import { buildSchemaSync } from "type-graphql";
import { RedisPubSub } from "graphql-redis-subscriptions";
import Redis from "ioredis";

import { Container } from "typedi";
import AuthService from "service/auth";
import Config from "utils/config";

export async function startGQLServer(): Promise<void> {
  const authService = Container.get(AuthService);
  const configService = Container.get(Config);
  const { redis, port } = configService.get();

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
    authChecker: ({ context }) => {
      return context.user != null && context.user.verified;
    },
    container: Container,
    pubSub,
  });

  const server = new ApolloServer({
    schema,
    playground: true,
    context: async (ctx) => {
      const { req, ...rest } = ctx;
      const key = req.header("authorization");
      if (!key) {
        return ctx;
      }
      try {
        const user = await authService.parseKeyToUser(
          key.replace("Bearer ", "")
        );
        return {
          user,
          req,
          ...rest,
        };
      } catch (ex) {
        return ctx;
      }
    },
  });

  const { url } = await server.listen(port);
  console.log(`Server is running, GraphQL Playground available at ${url}`);
}
