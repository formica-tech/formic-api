import { ReadStream } from "fs";
import ClassType from "interface/ClassType";
import { Readable } from "stream";

export enum ObjectType {
  ProfilePicture = "profile",
  MachinePicture = "machine",
}

export default interface IObjectStorage {
  init(): Promise<void>;
  uploadFile(
    objectType: ObjectType,
    name: string,
    file: ReadStream,
    contentType: string
  ): Promise<void>;
  readFile(
    objectType: ObjectType,
    name: string
  ): Promise<{ file: Readable; contentType: string }>;
}

export const ObjectStorage = class Dummy {} as ClassType<IObjectStorage>;
