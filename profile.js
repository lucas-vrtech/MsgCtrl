import { defineAsyncComponent } from "vue";

export async function Profile() {
  return {
    data() {
      return {
        profileReady: false,
        latestProfile: null,
        isLoading: false,
        editingProfile: false
      };
    },
    props: ['profile'],
    template: await fetch("./profile.html").then((r) => r.text()),
    methods: {
      async fetchProfile() {
        if (!this.profile) return;
        
        this.isLoading = true;
        console.log("Component fetching profile:", this.profile);
        
        if (this.$root.fetchProfile) {
          await this.$root.fetchProfile(this.profile);
          
          this.latestProfile = this.$root.latestProfile;
          this.profileReady = this.$root.profileReady;
        }
        
        this.isLoading = false;
      },
      async updateProfile(session) {
        if (!this.latestProfile || !session) return;
        
        this.isLoading = true;
        console.log("Profile component updating profile");
        
        try {
          const updatedProfile = await this.$root.updateProfile(this.latestProfile, session);
          
          this.editingProfile = false;
        } catch (error) {
          console.error("Error updating profile:", error);
        } finally {
          this.isLoading = false;
        }
      },
      startEditing() {
        this.editingProfile = true;
      },
      cancelEditing() {
        this.editingProfile = false;
        this.fetchProfile();
      }
    },
    created() {
      this.fetchProfile();
    },
    watch: {
      profile(newProfile, oldProfile) {
        console.log(`Profile changed from ${oldProfile} to ${newProfile}`);
        if (newProfile !== oldProfile) {
          this.fetchProfile();
        }
      },
      '$route'(to, from) {
        if (to.params.profile !== from.params.profile) {
          console.log(`Route changed from ${from.params.profile} to ${to.params.profile}`);
          this.fetchProfile();
        }
      }
    }
  };
}
