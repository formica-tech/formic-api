import { readFileSync } from "fs";
import jwt from "jsonwebtoken";

export default class JWT<T extends Record<string, unknown>> {
  readonly #publicKey: Buffer;
  readonly #privateKey: Buffer;
  constructor(keyPath: string) {
    this.#publicKey = readFileSync(keyPath + ".pub");
    this.#privateKey = readFileSync(keyPath);
  }

  sign(payload: T): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      jwt.sign(
        payload,
        this.#privateKey,
        { algorithm: "RS256", expiresIn: "24h" },
        function (err, token) {
          if (err != null) {
            reject(err);
            return;
          }

          if (token == null) {
            reject(new Error("token is null!"));
            return;
          }

          resolve(token);
        }
      );
    });
  }

  verify(token: string): T {
    const payload = jwt.verify(token, this.#publicKey);
    return payload as T;
  }
}
