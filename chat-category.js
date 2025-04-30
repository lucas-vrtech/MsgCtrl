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
        emits: ['enter-chat'],
        template: await fetch("./chat-category.html").then((r) => r.text())
    };
} 