export default class ServiceError extends Error {
  message: string;
  code: string;
  constructor(msg: string, code: string) {
    super();
    this.message = msg;
    this.code = code;
  }
}
