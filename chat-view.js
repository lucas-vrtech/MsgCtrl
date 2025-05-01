import { defineAsyncComponent } from "vue";

export async function ChatView() {
  return {
    data() {
      return {
      };
    },
    props: ['chatId'],
    template: await fetch("./chat-view.html").then((r) => r.text()),
  };
}
