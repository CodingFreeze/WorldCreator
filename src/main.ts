import { bootHollowmere } from "@worlds/hollowmere/main";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");
bootHollowmere(app).catch((err) => {
  console.error("boot failed", err);
});
