import { Transporter, createTransport } from "nodemailer";
import { Inject, Service } from "typedi";
import Config from "utils/config";

@Service()
class Mailer {
  private transporter: Transporter;
  constructor(@Inject(() => Config) private config: Config) {
    const { smtp } = this.config.get();
    this.transporter = createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: {
        user: smtp.username,
        pass: smtp.password,
      },
    });
  }

  send(to: string, subject: string, text: string): Promise<void> {
    const { smtp } = this.config.get();
    return new Promise((resolve, reject) =>
      this.transporter.sendMail(
        {
          from: `"Formica" <${smtp.username}>`,
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
