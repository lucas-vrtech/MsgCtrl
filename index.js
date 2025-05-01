import { createApp, defineAsyncComponent } from "vue";
import { GraffitiLocal } from "@graffiti-garden/implementation-local";
import { GraffitiRemote } from "@graffiti-garden/implementation-remote";
import { GraffitiPlugin } from "@graffiti-garden/wrapper-vue";
import { ChatCategory } from "./chat-category.js";
import { groupChatSchema } from "./schema.js";

const channels = ["designftw"];

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
      groupChatSchema
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
            },
            channels: [this.currentChatObject.channel],
        },
        session,
      );
      this.myMessage = "";
      this.isLoading = false;
    },

    async createChannel(session) {
      this.isLoading = true;
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
    graffiti: new GraffitiLocal(),
     //graffiti: new GraffitiRemote(),
  })
  .mount("#app");
