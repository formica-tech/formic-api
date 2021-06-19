import UserVerificationCode from "entity/userVerificationCode";
import { FileUpload, GraphQLUpload } from "graphql-upload";
import AuthService, {
  LOGIN_FAILED,
  USER_ALREADY_EXISTS,
  USER_NOT_FOUND,
} from "service/auth";
import {
  Arg,
  Authorized,
  createUnionType,
  Ctx,
  Field,
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
export default class Auth {
  @Inject(() => AuthService)
  private readonly authService: AuthService;

  @Query(() => User)
  @Authorized()
  async me(@Ctx("user") user: User): Promise<User> {
    return user;
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
      if (e.code === LOGIN_FAILED || e.code === USER_NOT_FOUND) {
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
      if (ex.code === USER_ALREADY_EXISTS) {
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

  @Mutation(() => UserVerificationCode)
  async resendCode(
    @Ctx("user") user: User | null,
    @Arg("verificationId") verificationId: string
  ): Promise<UserVerificationCode> {
    return this.authService.resendCode(user, verificationId);
  }

  @Mutation(() => ForgotPasswordResult)
  async forgotPassword(
    @Arg("email") email: string
  ): Promise<UserVerificationCode | UserNotFound> {
    try {
      return this.authService.forgotPassword(email);
    } catch (e) {
      if (e.code === USER_NOT_FOUND) {
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
class PasswordChanged {
  constructor(email: string) {
    this.email = email;
  }

  @Field()
  email: string;
}

const ForgotPasswordResult = createUnionType({
  name: "ForgotPasswordResult",
  types: () => [UserNotFound, UserVerificationCode],
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
