import { defineAsyncComponent } from "vue";
import { groupChatSchema, categoryMappingSchema } from "./schema.js";
import { ChatCategory } from "./chat-category.js";

export async function MainView() {
  return {
    components: {
      ChatCategory: defineAsyncComponent(ChatCategory)
    },
    data() {
      return {
        myNewChatName: "",
        myNewChatCategory: "Inbox",
        currentChat: null,
        isLoading: false,
        categoryMappings: {},
        categoriesLoaded: false,
        groupChatSchema
      };
    },
    template: await fetch("./main-view.html").then((r) => r.text()),
    
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
      removeURLFromUsername(username) {
        return this.$root.removeURLFromUsername(username);
      },
      
      async createChannel(session) {
        if (!session) return;
        
        this.isLoading = true;
        console.log("Creating channel:", this.myNewChatName);
        
        try {
          const channelId = crypto.randomUUID();
          const chatObject = {
            value: { 
              activity: 'Create',
              object: {
                type: 'Group Chat',
                name: this.myNewChatName,
                channel: channelId,
              }
            },
            channels: ['designftw-lucas'],
          };
          
          const createdChat = await this.$graffiti.put(chatObject, session);
          
          if (this.userCategoryChannel) {
            await this.setChatCategory(
              channelId, 
              this.myNewChatCategory, 
              session
            );
          }
          
          this.myNewChatName = "";
        } catch (error) {
          console.error('Error creating channel:', error);
        } finally {
          this.isLoading = false;
        }
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
            categoryMappingSchema
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
      
      enterChat(chat) {
        console.log('Entering chat:', chat);
        this.$router.push('/chat/' + chat.value.object.channel);
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
      }
    },
    
    created() {
      if (this.$graffitiSession.value) {
        this.loadCategoryMappings();
      }
    }
  };
}
