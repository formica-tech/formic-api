import ClassType from "interface/ClassType";

export default interface IMailer {
  send(to: string, subject: string, text: string): Promise<void>;
}

export const Mailer = class Dummy {} as ClassType<IMailer>;
