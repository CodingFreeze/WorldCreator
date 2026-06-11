import { bootDevScene } from "./devscene/main";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");
bootDevScene(app).catch((err) => {
  console.error("boot failed", err);
});
