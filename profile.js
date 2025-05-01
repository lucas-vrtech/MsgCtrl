import { defineAsyncComponent } from "vue";

export async function Profile() {
  return {
    data() {
      return {
      };
    },
    props: ['profile'],
    template: await fetch("./profile.html").then((r) => r.text()),
  };
}
