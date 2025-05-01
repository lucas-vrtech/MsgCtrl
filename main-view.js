import { defineAsyncComponent } from "vue";

export async function Profile() {
  return {
    data() {
      return {
      };
    },
    template: await fetch("./profile.html").then((r) => r.text()),
  };
}
