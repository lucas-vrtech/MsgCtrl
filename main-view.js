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
        joinedChannels: {},
        joinedChannelsLoaded: false,
        publicChannelsToShow: [],
        selectedPublicChannel: null,
        showChannelOptions: false,
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
      },
      
      userJoinedChannel() {
        if (!this.$graffitiSession.value) return null;
        const username = this.removeURLFromUsername(this.$graffitiSession.value.actor);
        return `${username}-joined-channels`;
      }
    },
    
    watch: {
      '$graffitiSession.value': async function(newSession) {
        if (newSession) {
          await Promise.all([
            this.loadCategoryMappings(),
            this.loadJoinedChannels(),
            this.loadPublicChannels()
          ]);
        } else {
          this.categoryMappings = {};
          this.categoriesLoaded = false;
          this.joinedChannels = {};
          this.joinedChannelsLoaded = false;
          this.publicChannelsToShow = [];
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
          
          if (this.userJoinedChannel) {
            await this.joinChannel(channelId, session);
          }
          
          this.myNewChatName = "";
          
          await this.loadPublicChannels();
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
      
      async loadJoinedChannels() {
        if (!this.$graffitiSession.value || !this.userJoinedChannel) {
          return;
        }
        
        this.isLoading = true;
        this.joinedChannels = {};
        
        try {
          const joinedIterator = await this.$graffiti.discover(
            [this.userJoinedChannel],
            {
              properties: {
                value: {
                  required: ['channelId', 'joined'],
                  properties: {
                    channelId: { type: 'string' },
                    joined: { type: 'boolean' }
                  }
                }
              }
            }
          );
          
          for await (const { object } of joinedIterator) {
            const channelId = object.value.channelId;
            const joined = object.value.joined;
            
            this.joinedChannels[channelId] = {
              mappingObject: object,
              joined: joined
            };
          }
          
          this.joinedChannelsLoaded = true;
          console.log('Loaded joined channels:', this.joinedChannels);
        } catch (error) {
          console.error('Error loading joined channels:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async loadPublicChannels() {
        if (!this.$graffitiSession.value) {
          return;
        }
        
        this.isLoading = true;
        
        try {
          const channelsIterator = await this.$graffiti.discover(
            ['designftw-lucas'],
            {
              value: {
                properties: {
                  activity: { type: "string", const: "Create" },
                  object: {
                    type: { type: "string", const: "Group Chat" }
                  }
                }
              }
            }
          );
          
          const channels = [];
          for await (const { object } of channelsIterator) {
            channels.push(object);
          }
          
          this.publicChannelsToShow = channels;
          console.log('Loaded public channels:', channels);
        } catch (error) {
          console.error('Error loading public channels:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async joinChannel(channelId, session) {
        if (!this.$graffitiSession.value || !this.userJoinedChannel) {
          return;
        }
        
        this.isLoading = true;
        
        try {
          const existingJoined = this.joinedChannels[channelId];
          
          if (existingJoined) {
            // Update existing mapping
            await this.$graffiti.patch(
              {
                value: [
                  {
                    op: "replace",
                    path: "/joined",
                    value: true
                  }
                ]
              },
              existingJoined.mappingObject,
              session
            );
            
            existingJoined.joined = true;
          } else {
            // Create new mapping
            const joinedObject = {
              value: {
                channelId: channelId,
                joined: true
              },
              channels: [this.userJoinedChannel]
            };
            
            const createdJoined = await this.$graffiti.put(joinedObject, session);
            
            this.joinedChannels[channelId] = {
              mappingObject: createdJoined,
              joined: true
            };
          }
          
          if (!this.categoryMappings[channelId]) {
            await this.setChatCategory(channelId, "Inbox", session);
          }
          
          console.log(`Joined channel: ${channelId}`);
        } catch (error) {
          console.error('Error joining channel:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async leaveChannel(channelId, session) {
        if (!this.$graffitiSession.value || !this.userJoinedChannel) {
          return;
        }
        
        this.isLoading = true;
        
        try {
          const existingJoined = this.joinedChannels[channelId];
          
          if (existingJoined) {
            // Update existing mapping
            await this.$graffiti.patch(
              {
                value: [
                  {
                    op: "replace",
                    path: "/joined",
                    value: false
                  }
                ]
              },
              existingJoined.mappingObject,
              session
            );
            
            existingJoined.joined = false;
            console.log(`Left channel: ${channelId}`);
          }
        } catch (error) {
          console.error('Error leaving channel:', error);
        } finally {
          this.isLoading = false;
        }
      },
      
      hasJoinedChannel(channelId) {
        if (!this.joinedChannelsLoaded) {
          return false; 
        }
        
        const joined = this.joinedChannels[channelId];
        return joined ? joined.joined : false;
      },
      
      async joinSelectedChannel() {
        if (!this.selectedPublicChannel || !this.$graffitiSession.value) return;
        
        const channelId = this.selectedPublicChannel.value.object.channel;
        await this.joinChannel(channelId, this.$graffitiSession.value);
        this.selectedPublicChannel = null;
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
        Promise.all([
          this.loadCategoryMappings(),
          this.loadJoinedChannels(),
          this.loadPublicChannels()
        ]);
      }
    }
  };
}
