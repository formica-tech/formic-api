import User from "entity/user";
import UserVerificationCode from "entity/userVerificationCode";
import { ReadStream } from "fs";
import ServiceError from "service/ServiceError";
import { Inject, Service } from "typedi";
import { EntityManager } from "typeorm";
import { InjectManager } from "typeorm-typedi-extensions";
import Config from "utils/config";
import JWT from "utils/jwt";
import ObjectStorage, { ObjectType } from "utils/objectStorage";
import Mailer from "utils/mailer";

export type JwtPayload = {
  user: {
    id: string;
    email: string;
  };
  hasura: {
    allowedRoles: string[];
  };
};

@Service()
export default class AuthService {
  @Inject(() => Mailer)
  private readonly mailer: Mailer;

  @InjectManager()
  private readonly entityManager: EntityManager;

  @Inject(() => ObjectStorage)
  private readonly objectStorage: ObjectStorage;

  private jwt: JWT<JwtPayload>;

  constructor(@Inject(() => Config) config: Config) {
    this.jwt = new JWT<JwtPayload>(config.get().key.private);
  }

  async parseKeyToUser(key: string): Promise<User> {
    const payload = this.jwt.verify(key);
    const user = await User.findOne(payload.user.id);
    if (!user) {
      throw this.userNotFound();
    }
    return user;
  }

  async login(email: string, password: string): Promise<string> {
    const user = await User.findOne({ email });
    if (!user) {
      throw this.userNotFound();
    }
    if (!user.checkPassword(password)) {
      throw new ServiceError("invalid credentials", LOGIN_FAILED);
    }
    return this.jwt.sign({
      user: { id: user.id, email: user.email },
      hasura: { allowedRoles: ["user"] },
    });
  }

  async signUp(email: string, password: string): Promise<string> {
    const count = await User.count({ email });
    if (count > 0) {
      throw new ServiceError("user already exists", USER_ALREADY_EXISTS);
    }

    const user = new User();
    user.email = email;
    const username = email.split("@")[0];
    if (username) {
      user.username = username;
    }
    user.setPassword(password);

    const code = await this.entityManager.transaction((t) => {
      return t
        .save(user)
        .then((u) => this.sendVerificationEmail(u))
        .then((c) => t.save(c));
    });
    return code.id;
  }

  private async sendVerificationEmail(
    user: User
  ): Promise<UserVerificationCode> {
    const code = new UserVerificationCode(user);
    await this.mailer.send(
      user.email,
      "Verification Code",
      "Your verification code: " + code.code
    );
    return code;
  }

  private async checkVerificationCode<T>(
    verificationId: string,
    code: string,
    handleVerified: (entityManager: EntityManager, user: User) => Promise<T>
  ): Promise<T> {
    const verificationCode = await UserVerificationCode.findOne(
      {
        id: verificationId,
      },
      { relations: ["user"] }
    );

    if (!verificationCode) {
      throw this.invalidVerificationId();
    }

    if (verificationCode.code !== code) {
      throw new ServiceError(
        "invalid verification code",
        INVALID_VERIFICATION_CODE
      );
    }

    if (Date.now() > verificationCode.expiresAt.valueOf()) {
      await verificationCode.remove();
      throw new ServiceError("verification is expired", VERIFICATION_EXPIRED);
    }

    return await this.entityManager.transaction(async (t: EntityManager) => {
      await t.delete(UserVerificationCode, { id: verificationId });
      return handleVerified(t, verificationCode.user);
    });
  }

  async verify(
    user: User | null,
    code: string,
    verificationId: string
  ): Promise<void> {
    if (!user) {
      throw this.userNotFound();
    }
    await this.checkVerificationCode<void>(
      verificationId,
      code,
      async (t: EntityManager, user) => {
        user.verified = true;
        await t.save(user);
      }
    );
  }

  async resendCode(
    user: User | null,
    id: string
  ): Promise<UserVerificationCode> {
    if (!user) {
      throw this.userNotFound();
    }
    const oldCode = await UserVerificationCode.findOne(
      {
        id,
      },
      { relations: ["user"] }
    );

    if (!oldCode) {
      throw this.invalidVerificationId();
    }

    if (oldCode.user.id !== user.id) {
      throw new ServiceError(
        "invalid verification user",
        INVALID_VERIFICATION_USER
      );
    }

    return this.entityManager.transaction(async (t) => {
      await t.delete(UserVerificationCode, { id });
      return this.sendVerificationEmail(oldCode.user).then((c) => t.save(c));
    });
  }

  async forgotPassword(email: string): Promise<UserVerificationCode> {
    const user = await User.findOne({ email });
    if (!user) {
      throw this.userNotFound();
    }
    const code = await this.sendVerificationEmail(user);
    return code.save();
  }

  async restorePassword(
    verificationId: string,
    code: string,
    newPassword: string
  ): Promise<User> {
    return await this.checkVerificationCode(
      verificationId,
      code,
      async (t, user) => {
        user.setPassword(newPassword);
        await t.save(user);
        return user;
      }
    );
  }

  async uploadProfilePicture(
    user: User,
    file: ReadStream,
    contentType: string
  ): Promise<void> {
    await this.objectStorage.uploadFile(
      ObjectType.ProfilePicture,
      user.id,
      file,
      contentType
    );
  }

  userNotFound(): ServiceError {
    return new ServiceError("user not found", USER_NOT_FOUND);
  }
  invalidVerificationId(): ServiceError {
    return new ServiceError("invalid verification id", INVALID_VERIFICATION_ID);
  }
}

export const INVALID_VERIFICATION_ID = "INVALID_VERIFICATION_ID";
export const INVALID_VERIFICATION_USER = "INVALID_VERIFICATION_USER";
export const INVALID_VERIFICATION_CODE = "INVALID_VERIFICATION_CODE";
export const VERIFICATION_EXPIRED = "VERIFICATION_EXPIRED";
export const USER_NOT_FOUND = "USER_NOT_FOUND";
export const LOGIN_FAILED = "LOGIN_FAILED";
export const USER_ALREADY_EXISTS = "USER_ALREADY_EXISTS";
