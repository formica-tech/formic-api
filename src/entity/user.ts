import { IsEmail } from "class-validator";
import UserVerificationCode from "entity/userVerificationCode";
import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import * as crypto from "crypto";

@Entity()
@ObjectType()
class User extends BaseEntity {
  @Field(() => ID)
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Field()
  @Column()
  username: string;

  @Field()
  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  salt: string;

  @Field()
  @Column({ default: "" })
  firstName: string;

  @Field()
  @Column({ default: "" })
  lastName: string;

  @Field()
  @Column({ unique: true, nullable: true })
  phone: string;

  @Field()
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
