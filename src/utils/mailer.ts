import config from "config";
import { Transporter, createTransport } from "nodemailer";
import { Service } from "typedi";

@Service()
class Mailer {
  private transporter: Transporter;
  constructor() {
    this.transporter = createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: {
        user: config.smtp.username,
        pass: config.smtp.password,
      },
    });
  }

  send(to: string, subject: string, text: string): Promise<void> {
    return new Promise((resolve, reject) =>
      this.transporter.sendMail(
        {
          from: `"Formica" <${config.smtp.username}>`,
          to,
          subject,
          text,
        },
        (err) => (err ? reject(err) : resolve())
      )
    );
  }
}

export default Mailer;
