import { IsEmail } from "class-validator";
import UserVerificationCode from "entity/userVerificationCode";
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import * as crypto from "crypto";

@Entity()
class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  username: string;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  salt: string;

  @Column({ default: "" })
  firstName: string;

  @Column({ default: "" })
  lastName: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({
    default: false,
  })
  verified: boolean;

  @OneToMany(() => UserVerificationCode, (code) => code.user)
  verificationCodes: UserVerificationCode[];

  @UpdateDateColumn()
  updatedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  setPassword(password: string): void {
    this.salt = crypto.randomBytes(16).toString("hex");
    this.passwordHash = this.hashPassword(password);
  }

  private hashPassword(password: string): string {
    return crypto
      .pbkdf2Sync(password, this.salt, 1000, 64, `sha512`)
      .toString(`hex`);
  }

  checkPassword(password: string): boolean {
    return this.hashPassword(password) === this.passwordHash;
  }
}

export default User;
