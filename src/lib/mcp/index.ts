import { defineMcp } from "@lovable.dev/mcp-js";
import listBranches from "./tools/list-branches";
import listServices from "./tools/list-services";
import searchArticles from "./tools/search-articles";

export default defineMcp({
  name: "testd-mcp",
  title: "testD Health MCP",
  version: "0.1.0",
  instructions:
    "Read-only tools for the testD × SWING Clinic app: list clinic branches, list bookable services, and search published health/harm-reduction articles.",
  tools: [listBranches, listServices, searchArticles],
});
