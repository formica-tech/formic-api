import User from "entity/user";

declare global {
  namespace Express {
    interface Request {
      user: User | null;
    }
  }
}
