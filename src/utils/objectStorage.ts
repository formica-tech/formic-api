import { ReadStream } from "fs";
import { Readable } from "stream";
import { Inject, Service } from "typedi";
import Config from "utils/config";
import { Client } from "minio";

export enum ObjectType {
  ProfilePicture = "profile",
  MachinePicture = "machine",
}

@Service()
export default class ObjectStorage {
  private client: Client;
  private static MAIN_BUCKET = "formica";
  constructor(@Inject(() => Config) private config: Config) {}

  async init(): Promise<void> {
    const {
      host,
      port,
      accessKey,
      secretKey,
    } = this.config.get().objectStorage;
    this.client = new Client({
      endPoint: host,
      port,
      accessKey,
      secretKey,
      useSSL: false,
    });
    await this.client.bucketExists(ObjectStorage.MAIN_BUCKET).then((exists) => {
      if (exists) {
        return;
      }
      return this.client.makeBucket(ObjectStorage.MAIN_BUCKET, "us-east-1");
    });
  }

  async uploadFile(
    objectType: ObjectType,
    name: string,
    file: ReadStream,
    contentType = "application/octet-stream"
  ): Promise<void> {
    await this.client.putObject(
      ObjectStorage.MAIN_BUCKET,
      `${objectType}/${name}`,
      file,
      {
        "Content-Type": contentType,
      }
    );
  }

  async readFile(
    objectType: ObjectType,
    name: string
  ): Promise<{ file: Readable; contentType: string }> {
    const filePath = `${objectType}/${name}`;
    const [file, stat] = await Promise.all([
      this.client.getObject(ObjectStorage.MAIN_BUCKET, filePath),
      this.client.statObject(ObjectStorage.MAIN_BUCKET, filePath),
    ]);
    return {
      file,
      contentType: stat.metaData["content-type"],
    };
  }
}
