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
                document.body.classList.add('is-dragging');
            },
            handleDragEnd(event) {
                event.target.classList.remove('dragging');
                document.body.classList.remove('is-dragging');
                document.querySelectorAll('[class*="category"]').forEach(el => {
                    el.classList.remove('drag-over');
                });
            },
            handleDragOver(event) {
                event.preventDefault();
                event.currentTarget.classList.add('drag-over');
            },
            handleDragLeave(event) {
                event.currentTarget.classList.remove('drag-over');
            },
            handleDrop(event) {
                event.currentTarget.classList.remove('drag-over');
                
                const chat = JSON.parse(event.dataTransfer.getData('text/plain'));
                this.$emit('change-category', chat, this.chatCategoryName);
            }
        }
    };
} 