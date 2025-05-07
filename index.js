import { createApp, defineAsyncComponent } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { ChatCategory } from "./chat-category.js";
import { groupChatSchema } from "./schema.js";
import { Profile } from "./profile.js";
import { MainView } from "./main-view.js";
import { ChatView } from "./chat-view.js";

const channels = ["designftw-lucas"];

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {path: "/", component: MainView},
    {path: "/profile/:profile", component: Profile, props: true},
    {path: "/chat/:chatId", component: ChatView, props: true},
  ],
});

createApp({
  components: {
    ChatCategory: defineAsyncComponent(ChatCategory)
  },
  data() {
    return {
      myMessage: "",
      myNewChatName: "",
      myNewChatCategory: "Inbox",
      currentChat: null,
      sentMessageObjects: [],
      messageObjects: [],
      currentlyEditingMessage: null,
      isLoading: false,
      renameChat: false,
      newChatName: "",
      profile: null,
      profileReady: false,
      thisProfile: null,
      latestProfile: null,
      groupChatSchema,
      editingProfile: false,
    };
  },

  computed: {
    currentChatObject() {
      return this.currentChat?.value?.object;
    }
  },

  methods: {
    async sendMessage(session) {
      this.isLoading = true;
      //await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.$graffiti.put(
        {
            value: {
              content: this.myMessage,
              published: Date.now(),
              actor: session.actor
            },
            channels: [this.currentChatObject.channel],
        },
        session,
      );
      this.myMessage = "";
      this.isLoading = false;
    },

    async fetchProfile(profile){
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

    async updateProfile(session){
      this.isLoading = true;
      const updatedProfile = await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/object/name",
              value: this.latestProfile.value.object.name
            },
            {
              op: "replace",
              path: "/object/email",
              value: this.latestProfile.value.object.email
            },
            {
              op: "replace",
              path: "/object/picURL",
              value: this.latestProfile.value.object.picURL
            }
          ]
        },
        this.latestProfile,
        session
      );
      this.editingProfile = false;
      this.isLoading = false;
    },

    async createChannel(session) {
      this.isLoading = true;
      console.log("Creating channel:", this.myNewChatName);
      await this.$graffiti.put(
        {
          value: { 
            activity: 'Create',
            object: {
              type: 'Group Chat',
              name: this.myNewChatName,
              channel: crypto.randomUUID(),
              category: this.myNewChatCategory
            }
           },
           channels,
        },
        session,
      );
      this.myNewChatName = "";
      this.isLoading = false;
    },

    async updateChatName(){
      this.isLoading = true;
      this.renameChat = false;

      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/object/name",
              value: this.newChatName
            }
          ]
        },
        this.currentChat,
        this.$graffitiSession.value
      );

      // Update the local currentChat object
      this.currentChat.value.object.name = this.newChatName;
      this.isLoading = false;
    },

    async enterChat(chat){
      console.log('Entering chat:', chat);
      this.isLoading = true;
    
      this.currentChat = chat;


      this.isLoading = false;
    },

    async exitChat(){
      this.currentChat = null;
    },

    async editMessage(message){
      this.isLoading = true;
      this.currentlyEditingMessage = null;

      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/content",
              value: message.value.content
            }
          ]
        },
        message,
        this.$graffitiSession.value
      );

      this.isLoading = false;
    },

    async deleteMessage(message){
      this.isLoading = true;

      await this.$graffiti.delete(message);

      this.isLoading = false;
    },

    async changeChatCategory(chat, newCategory) {
      this.isLoading = true;
      
      await this.$graffiti.patch(
        {
          value: [
            {
              op: "replace",
              path: "/object/category",
              value: newCategory
            }
          ]
        },
        chat,
        this.$graffitiSession.value
      );

      chat.value.object.category = newCategory;
      this.isLoading = false;
    },

    /*async getMessages() {
      this.isLoading = true;
      //await new Promise((resolve) => setTimeout(resolve, 1000));
      const messageObjectsIterator = await this.$graffiti.discover(channels, {
        value: {
            properties: {
              content: { type: "string" },
              published: { type: "number" },
            },
        },
      });

      console.log(messageObjectsIterator);

      const newMessageObjects = [];
      for await (const { object } of messageObjectsIterator) {
        newMessageObjects.push(object);
      }
      this.isLoading = false;

      // Sort here
      this.messageObjects = newMessageObjects.toSorted((a, b) =>  b.published - a.published);
    },*/

    *getMessageObjectsIterator() {
      for (const object of this.sentMessageObjects) {
        yield { object };
      }
    },
  },
})
  .use(GraffitiPlugin, {
    //graffiti: new GraffitiLocal(),
     graffiti: new GraffitiRemote(),
  })
  .use(router)
  .mount("#app");
