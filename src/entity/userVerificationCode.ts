import User from "entity/user";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity()
class UserVerificationCode {
  EXPIRE_DURATION_MS = 2 * 24 * 60 * 60 * 1000;

  constructor(user?: User) {
    this.code = Math.random().toString(36).substring(2, 8);
    this.expiresAt = new Date(Date.now() + this.EXPIRE_DURATION_MS);
    if (user) {
      this.user = user;
    }
  }

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
