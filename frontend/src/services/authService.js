import supabase from "../lib/supabase";

export const authService = {
  async login(email, password) {
    return await supabase.auth.signInWithPassword({ email, password });
  },

  async register(fullName, email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { data, error };
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
      });
      if (profileError) {
        return { data, error: profileError };
      }
    }

    return { data, error: null };
  },

  async logout() {
    return await supabase.auth.signOut();
  },

  async getSession() {
    return await supabase.auth.getSession();
  },

  onAuthStateChange(callback) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
    return subscription;
  }
};
