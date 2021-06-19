import { ApolloServer } from "apollo-server-express";
import { Express } from "express";
import { graphqlUploadExpress } from "graphql-upload";
import { buildSchemaSync, PubSubEngine } from "type-graphql";

import { Container } from "typedi";

export async function gql(app: Express, pubSub: PubSubEngine): Promise<void> {
  const schema = buildSchemaSync({
    resolvers: [__dirname + "/resolver/**/*.{js,ts}"],
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
