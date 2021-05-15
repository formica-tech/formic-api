import User from "entity/user";
import UserVerificationCode from "entity/userVerificationCode";
import { ReadStream } from "fs";
import { Inject, Service } from "typedi";
import { EntityManager, Repository } from "typeorm";
import { InjectManager, InjectRepository } from "typeorm-typedi-extensions";
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
  @InjectRepository(User)
  private readonly userRepo: Repository<User>;

  @InjectRepository(UserVerificationCode)
  private readonly userVerificationRepo: Repository<UserVerificationCode>;

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
    const user = await this.userRepo.findOne(payload.user.id);
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    return user;
  }

  async login(email: string, password: string): Promise<string> {
    const user = await this.userRepo.findOne({ email });
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    if (!user.checkPassword(password)) {
      throw AuthService.ERR_LOGIN_FAILED;
    }
    return this.jwt.sign({
      user: { id: user.id, email: user.email },
      hasura: { allowedRoles: ["user"] },
    });
  }

  async signUp(email: string, password: string): Promise<string> {
    const count = await this.userRepo.count({ email });
    if (count > 0) {
      throw AuthService.ERR_USER_ALREADY_EXISTS;
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
    const verificationCode = await this.userVerificationRepo.findOne(
      {
        id: verificationId,
      },
      { relations: ["user"] }
    );

    if (!verificationCode) {
      throw AuthService.ERR_INVALID_VERIFICATION_ID;
    }

    if (verificationCode.code !== code) {
      throw AuthService.ERR_INVALID_VERIFICATION_CODE;
    }

    if (Date.now() > verificationCode.expiresAt.valueOf()) {
      await this.userRepo.delete({ id: verificationId });
      throw AuthService.ERR_VERIFICATION_EXPIRED;
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
      throw AuthService.ERR_USER_NOT_FOUND;
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

  async resendCode(user: User | null, id: string): Promise<string> {
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    const oldCode = await this.userVerificationRepo.findOne(
      {
        id,
      },
      { relations: ["user"] }
    );

    if (!oldCode) {
      throw AuthService.ERR_INVALID_VERIFICATION_ID;
    }

    if (oldCode.user.id !== user.id) {
      throw AuthService.ERR_INVALID_VERIFICATION_USER;
    }

    return this.entityManager.transaction(async (t) => {
      await t.delete(UserVerificationCode, { id });
      const code = await this.sendVerificationEmail(oldCode.user).then((c) =>
        t.save(c)
      );
      return code.id;
    });
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await this.userRepo.findOne({ email });
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    const code = await this.sendVerificationEmail(user);
    return this.userVerificationRepo.save(code).then(({ id }) => id);
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

  static ERR_INVALID_VERIFICATION_ID = new Error("invalid verification id");
  static ERR_INVALID_VERIFICATION_USER = new Error("invalid verification user");
  static ERR_INVALID_VERIFICATION_CODE = new Error("invalid verification code");
  static ERR_VERIFICATION_EXPIRED = new Error("verification is expired");
  static ERR_USER_NOT_FOUND = new Error("user not found");
  static ERR_LOGIN_FAILED = new Error("invalid credentials");
  static ERR_USER_ALREADY_EXISTS = new Error("user already exists");
}
