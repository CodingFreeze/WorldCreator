import { bootHub } from "@hub/main";

const app = document.getElementById("app");
if (!app) throw new Error("#app not found");

// Direct world boot for development: ?world=hollowmere
const direct = new URLSearchParams(location.search).get("world");
if (direct === "hollowmere") {
  void import("@worlds/hollowmere/main").then(({ bootHollowmere }) => bootHollowmere(app));
} else {
  bootHub(app);
}
