import User from "entity/user";
import UserVerificationCode from "entity/userVerificationCode";
import { EntityManager, Repository } from "typeorm";
import { InjectManager, InjectRepository } from "typeorm-typedi-extensions";
import JWT from "utils/jwt";
import config from "config";
import { Inject, Service } from "typedi";
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
  private userRepo: Repository<User>;

  @InjectRepository(UserVerificationCode)
  private userVerificationRepo: Repository<UserVerificationCode>;

  @Inject(() => Mailer)
  private mailer: Mailer;

  @InjectManager()
  private entityManager: EntityManager;

  private jwt = new JWT<JwtPayload>(config.keyPath);
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

    const code = await this.entityManager.transaction(async (t) => {
      const newUser = await t.save(user);
      return this.sendVerificationEmail(newUser);
    });
    return code.id;
  }

  private async sendVerificationEmail(
    user: User
  ): Promise<UserVerificationCode> {
    const code = new UserVerificationCode(user);
    return await this.entityManager.transaction(async (t) => {
      await this.mailer.send(
        user.email,
        "Verification Code",
        "Your verification code: " + code.code
      );
      return t.save(code);
    });
  }

  private async checkVerificationCode<T>(
    userId: string,
    verificationId: string,
    code: string,
    handleVerified: (entityManager: EntityManager) => Promise<T>
  ): Promise<T> {
    const verificationCode = await this.userVerificationRepo.findOne(
      {
        id: verificationId,
      },
      { relations: ["user"] }
    );

    if (userId !== verificationCode?.user.id) {
      throw AuthService.ERR_INVALID_VERIFICATION_USER;
    }

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
      return handleVerified(t);
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
      user.id,
      verificationId,
      code,
      async (t: EntityManager) => {
        user.verified = true;
        await t.save(user);
      }
    );
  }

  async forgotPassword(email: string): Promise<string> {
    const user = await this.userRepo.findOne({ email });
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    const code = await this.sendVerificationEmail(user);
    return code.id;
  }

  async updatePassword(
    email: string,
    verificationId: string,
    code: string,
    newPassword: string
  ): Promise<void> {
    const user = await this.userRepo.findOne({ email });
    if (!user) {
      throw AuthService.ERR_USER_NOT_FOUND;
    }
    await this.checkVerificationCode(
      user.id,
      verificationId,
      code,
      async (t) => {
        user.setPassword(newPassword);
        await t.save(user);
      }
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
