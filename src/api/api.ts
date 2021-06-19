import AuthService from "service/auth";
import { ObjectStorage, ObjectType } from "interface/ObjectStorage";
import { Container } from "typedi";
import { Express } from "express";

export default async function api(app: Express): Promise<void> {
  const authService = Container.get(AuthService);

  app.use(async (req, _res, next) => {
    const key = req.header("authorization") || String(req.query.token);
    req.user = null;
    if (!key) {
      next();
      return;
    }
    try {
      req.user = await authService.parseKeyToUser(key.replace("Bearer ", ""));
    } catch (ex) {
      console.error(ex);
    }
    next();
  });

  const objectStorage = Container.get(ObjectStorage);
  app.get("/media/profile", async (req, res) => {
    if (!req.user) {
      res.sendStatus(401);
      return;
    }

    try {
      const { file, contentType } = await objectStorage.readFile(
        ObjectType.ProfilePicture,
        req.user.id
      );
      res.setHeader("Content-Type", contentType);

      file.pipe(res);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  });
}
