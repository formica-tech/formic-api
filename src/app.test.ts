import { init } from "app";

jest.setTimeout(60000);
test("app runs without throwing", async () => {
  const testInit = async () => {
    const app = await init();
    await app.close();
  };
  await expect(testInit()).resolves.toBe(undefined);
});
