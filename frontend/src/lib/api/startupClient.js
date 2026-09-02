import { request } from "./authClient";

let catalogRequest = null;

export function fetchStartups() {
  if (!catalogRequest) {
    catalogRequest = request("/startups").catch((error) => {
      catalogRequest = null;
      throw error;
    });
  }
  return catalogRequest;
}
