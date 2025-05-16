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
    },

    async fetchProfile(profile){
      this.profileReady = false;
      this.latestProfile = null;
      this.editingProfile = false;
      
      this.profile = profile;
      console.log("Fetching profile:", profile);
      await this.getOrCreateProfile(this.$graffitiSession.value);
    },

    async createProfile(session){
      console.log("Creating profile!");
      this.thisProfile = {
        value: { 
          activity: 'Create',
          object: {
            type: 'Profile',
            name: '',
            email: '',
            username: this.profile,
            picURL: '',
          }
         },
         channels: [this.profile],
      }
      await this.$graffiti.put(
        this.thisProfile,
        session,
      );
      this.latestProfile = this.thisProfile;
      console.log("Created profile!");
    },

    async getOrCreateProfile(session) {
      this.isLoading = true;
      // First try to get the profile
      const profileIterator = await this.$graffiti.discover([this.profile], {
        value: {
          properties: {
            activity: { type: "string", const: "Create" },
            object: {
              type: { type: "string", const: "Profile" },
              username: { type: "string", const: this.profile }
            }
          }
        }
      });

      // Check if we found a profile
      for await (const { object } of profileIterator) {
        if (object.value.object.username === this.profile) {
          this.profileReady = true;
          console.log('Profile found:', object);
          this.latestProfile = object;
          this.isLoading = false;
          return object;
        }
      }

      // If no profile found, create a new one
      await this.createProfile(session);
      this.isLoading = false;
    },

    async updateProfile(profileData, session) {
      this.isLoading = true;
      
      const profileToUpdate = profileData || this.latestProfile;
      
      console.log("Updating profile:", profileToUpdate);
      
      const updatedProfile = await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/object/name",
              value: profileToUpdate.value.object.name
            },
            {
              op: "replace",
              path: "/object/email",
              value: profileToUpdate.value.object.email
            },
            {
              op: "replace",
              path: "/object/picURL",
              value: profileToUpdate.value.object.picURL
            }
          ]
        },
        profileToUpdate,
        session
      );
      
      this.latestProfile = profileToUpdate;
      this.editingProfile = false;
      this.isLoading = false;
      
      return updatedProfile;
    },

  }
})
  .use(router)
  .use(GraffitiPlugin, {
    // graffiti: new GraffitiLocal(),
    graffiti: new GraffitiRemote(),
  })
  .mount("#app");
