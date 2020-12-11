import AuthService from "service/auth";
import {
  Arg,
  Authorized,
  createUnionType,
  Ctx,
  Field,
  ID,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import User from "entity/user";
import { Inject, Service } from "typedi";

@InputType()
class VerificationInput {
  @Field()
  id: string;
  @Field()
  code: string;
}

@Service()
@Resolver()
export default class AuthResolver {
  @Inject(() => AuthService)
  private readonly authService: AuthService;

  @Query(() => Me)
  @Authorized()
  async me(@Ctx("user") user: User): Promise<Me> {
    return Me.fromUser(user);
  }

  @Mutation(() => Token)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<Token> {
    const result = new Token();
    result.token = await this.authService.login(email, password);
    return result;
  }

  @Mutation(() => SignUpResult)
  async signup(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<typeof SignUpResult> {
    try {
      const verificationId = await this.authService.signUp(email, password);
      const token = await this.authService.login(email, password);
      return new SignedUp(verificationId, token);
    } catch (ex) {
      if (ex === AuthService.ERR_USER_ALREADY_EXISTS) {
        return new AlreadySignedUp(email);
      }
      throw ex;
    }
  }

  @Mutation(() => String)
  async verify(
    @Ctx("user") user: User | null,
    @Arg("id") id: string,
    @Arg("code") code: string
  ): Promise<string> {
    await this.authService.verify(user, code, id);
    return id;
  }

  @Mutation(() => ForgotPasswordResult)
  async forgotPassword(@Arg("email") email: string) {
    try {
      const id = await this.authService.forgotPassword(email);
      return new Verification(id);
    } catch (e) {
      if (e === AuthService.ERR_USER_NOT_FOUND) {
        return new UserNotFound(email);
      }
      throw e;
    }
  }

  @Mutation(() => PasswordChanged)
  async updatePassword(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Arg("verification") verificaiton: VerificationInput
  ) {
    await this.authService.updatePassword(
      email,
      verificaiton.id,
      verificaiton.code,
      password
    );
    return new PasswordChanged(email);
  }
}

@ObjectType()
class Me {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  username: string;

  static fromUser(user: User) {
    const me = new Me();
    me.id = user.id;
    me.email = user.email;
    me.username = user.username;
    return me;
  }
}

@ObjectType()
class Token {
  @Field()
  token: string;
}

@ObjectType()
class UserNotFound {
  constructor(email: string) {
    this.email = email;
  }

  @Field()
  email: string;
}

@ObjectType()
class Verification {
  constructor(id: string) {
    this.id = id;
  }

  @Field()
  id: string;
}

@ObjectType()
class PasswordChanged {
  constructor(email: string) {
    this.email = email;
  }

  @Field()
  email: string;
}

const ForgotPasswordResult = createUnionType({
  name: "ForgotPasswordResult",
  types: () => [UserNotFound, Verification],
});

const SignUpResult = createUnionType({
  name: "SignUpResult",
  types: () => [SignedUp, AlreadySignedUp] as const,
  resolveType: (value) => {
    if (value instanceof SignedUp) {
      return SignedUp;
    }
    if (value instanceof AlreadySignedUp) {
      return AlreadySignedUp;
    }
    return undefined;
  },
});

@ObjectType()
class AlreadySignedUp {
  constructor(email: string) {
    this.email = email;
  }

  @Field()
  email: string;
}

@ObjectType()
class SignedUp {
  constructor(id: string, token: string) {
    this.verificationId = id;
    this.token = token;
  }

  @Field()
  verificationId: string;

  @Field()
  token: string;
}
