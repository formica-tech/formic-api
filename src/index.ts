import { init } from "app";

init()
  .then((app) => app.listen())
  .catch(console.error);
