export default {
  port: 4000,
  keyPath: process.env.KEY_PATH || "./keys/jwtRS256.key",
  smtp: {
    host: "smtp.yandex.com",
    username: "hamzalitas@yandex.com",
    password: "Se*mCnvc.4ryaAY",
    port: 465,
    secure: true,
  },
};
