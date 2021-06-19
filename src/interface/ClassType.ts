export default interface ClassType<T = unknown> {
  new (...args: unknown[]): T;
}
