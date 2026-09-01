import { secrets } from "bun";

const password = Bun.secrets.get({
  service: "bun-app",
  name: "googlesub",
});

// Or if you prefer without an object
//const password = await Bun.secrets.get("my-app", "alice@example.com");

export async function getGoogleSubSecret() {
    return password;
}

export async function setGoogleSubSecret(googleSub: string) {

    if(!googleSub) {
        await secrets.set({
          service: "bun-app",
          name: "googlesub",
          value: googleSub,
        })
    }

    return ;
}

