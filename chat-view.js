import { defineAsyncComponent } from "vue";

export async function ChatView() {
  return {
    data() {
      return {
        currentChatObject: null,
        fullChatObject: null,
        isLoading: false,
        myMessage: "",
        renameChat: false,
        newChatName: "",
        currentlyEditingMessage: null
      };
    },
    props: ['chatId'],
    template: await fetch("./chat-view.html").then((r) => r.text()),
    methods: {
      async fetchChat() {
        if (!this.chatId) return;
        
        this.isLoading = true;
        console.log("Component fetching chat:", this.chatId);
        
        try {
          const chatIterator = await this.$graffiti.discover(['designftw-lucas'], {
            value: {
              properties: {
                activity: { type: "string", const: "Create" },
                object: {
                  type: { type: "string", const: "Group Chat" },
                  channel: { type: "string", const: this.chatId }
                }
              }
            }
          });
          
          for await (const { object } of chatIterator) {
            if (object.value.object.channel === this.chatId) {
              this.currentChatObject = object.value.object;
              this.fullChatObject = object;
              console.log('Chat found:', this.currentChatObject);
              break;
            }
          }
        } catch (error) {
          console.error("Error fetching chat:", error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async sendMessage(session) {
        if (!session || !this.myMessage || !this.currentChatObject) return;
        
        this.isLoading = true;
        try {
          await this.$graffiti.put(
            {
              value: {
                content: this.myMessage,
                published: Date.now(),
                actor: this.$root.removeURLFromUsername(session.actor)
              },
              channels: [this.chatId],
            },
            session,
          );
          this.myMessage = "";
        } catch (error) {
          console.error("Error sending message:", error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async updateChatName() {
        if (!this.$graffitiSession.value || !this.currentChatObject || !this.fullChatObject) return;
        
        this.isLoading = true;
        this.renameChat = false;
        
        try {
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
            this.fullChatObject,
            this.$graffitiSession.value
          );
          
          this.currentChatObject.name = this.newChatName;
        } catch (error) {
          console.error("Error updating chat name:", error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async editMessage(message) {
        if (!this.$graffitiSession.value) return;
        
        this.isLoading = true;
        this.currentlyEditingMessage = null;
        
        try {
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
        } catch (error) {
          console.error("Error editing message:", error);
        } finally {
          this.isLoading = false;
        }
      },
      
      async deleteMessage(message) {
        if (!this.$graffitiSession.value) return;
        
        this.isLoading = true;
        
        try {
          await this.$graffiti.delete(message, this.$graffitiSession.value);
        } catch (error) {
          console.error("Error deleting message:", error);
        } finally {
          this.isLoading = false;
        }
      }
    },
    created() {
      this.fetchChat();
    },
    watch: {
      chatId(newChatId, oldChatId) {
        console.log(`Chat ID changed from ${oldChatId} to ${newChatId}`);
        if (newChatId !== oldChatId) {
          this.fetchChat();
        }
      }
    }
  };
}
