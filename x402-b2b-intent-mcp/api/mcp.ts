import { createMcpHandler } from "@modelcontextprotocol/server";
import { createB2BIntentServer } from "../src/server.js";

export default createMcpHandler(createB2BIntentServer);
