import { createApp, defineAsyncComponent } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { ChatCategory } from "./chat-category.js";
import { groupChatSchema, categoryMappingSchema } from "./schema.js";
import { Profile } from "./profile.js";
import { MainView } from "./main-view.js";
import { ChatView } from "./chat-view.js";

// The channel that chats are put in
const channels = ["designftw-lucas"];

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {path: "/", component: MainView},
    {path: "/profile/:profile", component: Profile, props: true},
    {path: "/chat/:chatId", component: ChatView, props: true},
  ],
  scrollBehavior(to, from, savedPosition) {
    return { top: 0 }
  }
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
      categoryMappingSchema,
      editingProfile: false,
      categoryMappings: {},
      categoriesLoaded: false,
    };
  },

  computed: {
    currentChatObject() {
      return this.currentChat?.value?.object;
    },
    
    userCategoryChannel() {
      if (!this.$graffitiSession.value) return null;
      const username = this.removeURLFromUsername(this.$graffitiSession.value.actor);
      return `${username}-categories`;
    }
  },

  watch: {
    '$graffitiSession.value': async function(newSession) {
      if (newSession) {
        await this.loadCategoryMappings();
      } else {
        this.categoryMappings = {};
        this.categoriesLoaded = false;
      }
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
              actor: this.removeURLFromUsername(session.actor)
            },
            channels: [this.currentChatObject.channel],
        },
        session,
      );
      this.myMessage = "";
      this.isLoading = false;
    },

    removeURLFromUsername(username){
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

    async createChannel(session) {
      this.isLoading = true;
      console.log("Creating channel:", this.myNewChatName);
      

      const chatObject = {
        value: { 
          activity: 'Create',
          object: {
            type: 'Group Chat',
            name: this.myNewChatName,
            channel: crypto.randomUUID(),

          }
         },
         channels,
      };
      
      const createdChat = await this.$graffiti.put(chatObject, session);
      

      if (createdChat && this.userCategoryChannel) {
        await this.setChatCategory(
          createdChat.value.object.channel, 
          this.myNewChatCategory, 
          session
        );
      }
      
      this.myNewChatName = "";
      this.isLoading = false;
    },


    async loadCategoryMappings() {
      if (!this.$graffitiSession.value || !this.userCategoryChannel) {
        return;
      }
      
      this.isLoading = true;
      this.categoryMappings = {};
      
      try {
        const mappingsIterator = await this.$graffiti.discover(
          [this.userCategoryChannel],
          this.categoryMappingSchema
        );
        
        for await (const { object } of mappingsIterator) {
          const chatChannel = object.value.chatChannel;
          const category = object.value.category;
          

          this.categoryMappings[chatChannel] = {
            mappingObject: object,
            category: category
          };
        }
        
        this.categoriesLoaded = true;
        console.log('Loaded category mappings:', this.categoryMappings);
      } catch (error) {
        console.error('Error loading category mappings:', error);
      } finally {
        this.isLoading = false;
      }
    },
    

    getChatCategory(chatChannel) {
      if (!this.categoriesLoaded) {
        return 'Inbox'; 
      }
      
      const mapping = this.categoryMappings[chatChannel];
      return mapping ? mapping.category : 'Inbox';
    },
    

    async setChatCategory(chatChannel, category, session) {
      if (!this.$graffitiSession.value || !this.userCategoryChannel) {
        return;
      }
      
      this.isLoading = true;
      
      try {
        const existingMapping = this.categoryMappings[chatChannel];
        
        if (existingMapping) {

          await this.$graffiti.patch(
            {
              value: [
                {
                  op: "replace",
                  path: "/category",
                  value: category
                }
              ]
            },
            existingMapping.mappingObject,
            session
          );

          existingMapping.category = category;
        } else {
          const mappingObject = {
            value: {
              chatChannel: chatChannel,
              category: category
            },
            channels: [this.userCategoryChannel]
          };
          
          const createdMapping = await this.$graffiti.put(mappingObject, session);
          
          this.categoryMappings[chatChannel] = {
            mappingObject: createdMapping,
            category: category
          };
        }
        
        console.log(`Set category for ${chatChannel} to ${category}`);
      } catch (error) {
        console.error('Error setting category:', error);
      } finally {
        this.isLoading = false;
      }
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
      if (!this.$graffitiSession.value || !chat?.value?.object?.channel) {
        return;
      }
      
      await this.setChatCategory(
        chat.value.object.channel,
        newCategory,
        this.$graffitiSession.value
      );
    },

    *getMessageObjectsIterator() {
      for (const object of this.sentMessageObjects) {
        yield { object };
      }
    },
  },
})
  .use(router)
  .use(GraffitiPlugin, {
    //graffiti: new GraffitiLocal(),
     graffiti: new GraffitiRemote(),
  })
  .mount("#app");
