import { ApolloServer } from "apollo-server";
import { schema } from "gql/schema";
import AuthService from "service/auth";
import { Container } from "typedi";

export async function startGQLServer(port: number): Promise<void> {
  const authService = Container.get(AuthService);
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
