import { defineAsyncComponent } from "vue";

export async function ChatCategory() {
    return {
        props: {
            groupChatObjects: {
                type: Array,
                required: true
            },
            currentChatObject: {
                type: Object,
                default: null
            },
            chatCategoryName:{
                type: String,
                default: "Chat Category"
            }
        },
        emits: ['enter-chat', 'change-category', 'leave-channel'],
        template: await fetch("./chat-category.html").then((r) => r.text()),
        methods: {
            handleDragStart(event, chat) {
                event.dataTransfer.setData('text/plain', JSON.stringify(chat));
                event.target.classList.add('dragging');
            },
            handleDragEnd(event) {
                event.target.classList.remove('dragging');
            },
            handleDrop(event) {
                const chat = JSON.parse(event.dataTransfer.getData('text/plain'));
                // Always emit the change-category event, let the parent component handle it
                this.$emit('change-category', chat, this.chatCategoryName);
            }
        }
    };
} 