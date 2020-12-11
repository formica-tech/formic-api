import { AuthChecker, buildSchemaSync } from "type-graphql";
import User from "entity/user";
import { Container } from "typedi";

const customAuthChecker: AuthChecker<{ user: User | null }> = ({ context }) =>
  // roles
  {
    return context.user != null && context.user.verified;
  };
export const schema = buildSchemaSync({
  resolvers: [__dirname + "/resolver/**/*.resolver.ts"],
  authChecker: customAuthChecker,
  container: Container,
});
