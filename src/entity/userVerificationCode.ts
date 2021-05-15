import User from "entity/user";
import { Field, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
@ObjectType()
class UserVerificationCode extends BaseEntity {
  EXPIRE_DURATION_MS = 2 * 24 * 60 * 60 * 1000;

  constructor(user?: User) {
    super();
    // generate 6 digit verification code
    this.code = String(100000 + Math.floor(Math.random() * 900000));
    this.expiresAt = new Date(Date.now() + this.EXPIRE_DURATION_MS);
    if (user) {
      this.user = user;
    }
  }

  @Field()
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  code: string;

  @ManyToOne(() => User, (user) => user.verificationCodes)
  user: User;

  @Column({ type: "timestamptz" })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}

export default UserVerificationCode;
