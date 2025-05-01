import { defineAsyncComponent } from "vue";

export async function MainView() {
  return {
    data() {
      return {
      };
    },
    template: await fetch("./main-view.html").then((r) => r.text()),
  };
}
