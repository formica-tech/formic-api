import { FileUpload, GraphQLUpload } from "graphql-upload";
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

  @Mutation(() => LoginResult)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string
  ): Promise<InvalidCredentials | Token> {
    const result = new Token();
    try {
      result.token = await this.authService.login(email, password);
    } catch (e) {
      if (
        e === AuthService.ERR_LOGIN_FAILED ||
        e === AuthService.ERR_USER_NOT_FOUND
      ) {
        return new InvalidCredentials(email);
      }
      throw e;
    }
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
    @Arg("verification") verification: VerificationInput
  ): Promise<string> {
    await this.authService.verify(user, verification.code, verification.id);
    return verification.id;
  }

  @Mutation(() => Verification)
  async resendCode(
    @Ctx("user") user: User | null,
    @Arg("verificationId") verificationId: string
  ): Promise<Verification> {
    const id = await this.authService.resendCode(user, verificationId);
    return new Verification(id);
  }

  @Mutation(() => ForgotPasswordResult)
  async forgotPassword(
    @Arg("email") email: string
  ): Promise<Verification | UserNotFound> {
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
  async restorePassword(
    @Arg("newPassword") newPassword: string,
    @Arg("verification") verificaiton: VerificationInput
  ): Promise<PasswordChanged> {
    const user = await this.authService.restorePassword(
      verificaiton.id,
      verificaiton.code,
      newPassword
    );
    return new PasswordChanged(user.email);
  }

  @Authorized()
  @Mutation(() => Boolean)
  async uploadProfileImage(
    @Arg("image", () => GraphQLUpload) image: FileUpload,
    @Ctx("user") user: User
  ): Promise<boolean> {
    return this.authService
      .uploadProfilePicture(user, image.createReadStream(), image.mimetype)
      .then(() => true)
      .catch((err) => {
        console.error(err);
        return false;
      });
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

  @Field()
  verified: boolean;

  static fromUser(user: User) {
    const me = new Me();
    me.id = user.id;
    me.email = user.email;
    me.username = user.username;
    me.verified = user.verified;
    return me;
  }
}

@ObjectType()
class Token {
  @Field()
  token: string;
}

@ObjectType()
class InvalidCredentials {
  constructor(email: string) {
    this.email = email;
  }
  @Field()
  email: string;
}

const LoginResult = createUnionType({
  name: "LoginResult",
  types: () => [InvalidCredentials, Token],
});

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
