import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { Profile } from "./profile.js";
import { MainView } from "./main-view.js";
import { ChatView } from "./chat-view.js";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {path: "/", component: MainView},
    {path: "/profile/:profile", component: Profile, props: true},
    {path: "/chat/:chatId", component: ChatView, props: true},
    {path: "/:pathMatch(.*)*", redirect: "/"}
  ],
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
});

createApp({
  data() {
    return {};
  },
  methods: {
    // Keep only this utility method as it's used by multiple components
    removeURLFromUsername(username) {
      username = username.replace(/https?:\/\/[^\/]+\//, '');
      return username;
    }
  }
})
  .use(router)
  .use(GraffitiPlugin, {
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiRemote(),
  })
  .mount("#app");
