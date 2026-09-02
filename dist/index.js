import http from "node:http";
import { spawn } from "node:child_process";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const START_TOOL_NAME = "triggerware_start_monitor";
const DELETE_TOOL_NAME = "triggerware_delete_monitor";
let receiverServer = null;

const startToolParameters = {
  type: "object",
  additionalProperties: false,
  required: ["name", "prompt", "onResult"],
  properties: {
    name: {
      type: "string",
      description: "Short unique Triggerware trigger name, using lowercase letters, numbers, underscores, or hyphens."
    },
    prompt: {
      type: "string",
      description: "Natural-language Triggerware trigger request, including the query and schedule."
    },
    onResult: {
      type: "string",
      description: "What OpenClaw should do whenever Triggerware returns deltas."
    }
  }
};

const deleteToolParameters = {
  type: "object",
  additionalProperties: false,
  required: ["name"],
  properties: {
    name: {
      type: "string",
      description: "Name of the Triggerware trigger to delete."
    }
  }
};

function getPublicWebhookUrl(config) {
  if (config.publicWebhookUrl) {
    return String(config.publicWebhookUrl).replace(/\/+$/, "");
  }
  const port = Number(config.receiverPort || 8787);
  return `http://127.0.0.1:${port}/triggerware`;
}

function jsonResponse(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readJson(req, limitBytes = 1024 * 1024) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limitBytes) {
      throw new Error("request body too large");
    }
    chunks.push(chunk);
  }
  try {
    const raw = Buffer.concat(chunks).toString("utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("invalid JSON");
  }
}

function hasDeltas(payload) {
  const deltas = Array.isArray(payload?.deltas) ? payload.deltas : [];
  return deltas.some((delta) => {
    return Array.isArray(delta?.added) && delta.added.length > 0
      || Array.isArray(delta?.deleted) && delta.deleted.length > 0;
  });
}

function promptForPayload(payload) {
  const trigger = payload?.openclaw?.trigger || payload?.trigger || "unknown";
  const onResult = payload?.openclaw?.onResult || "Decide the appropriate next action based on the trigger results.";
  return [
    `Triggerware trigger "${trigger}" returned data.`,
    "",
    "Follow this instruction for what to do with the results:",
    onResult,
    "",
    "Raw Triggerware payload:",
    JSON.stringify(payload, null, 2)
  ].join("\n");
}

function runOpenClawAgent(config, prompt) {
  const command = config.openclawCommand || "openclaw";
  const args = ["agent"];
  if (config.agentId) {
    args.push("--agent", String(config.agentId));
  }
  if (config.sessionId) {
    args.push("--session-id", String(config.sessionId));
  } else if (!config.agentId && config.to) {
    args.push("--to", String(config.to));
  } else if (!config.agentId) {
    args.push("--agent", "main");
  }
  if (config.deliver) {
    args.push("--deliver");
  }
  if (config.replyChannel) {
    args.push("--reply-channel", String(config.replyChannel));
  }
  if (config.replyTo) {
    args.push("--reply-to", String(config.replyTo));
  }
  args.push("--message", prompt);

  const child = spawn(command, args, {
    env: process.env,
    stdio: "ignore",
    detached: true
  });
  child.unref();
}

function startReceiver(config) {
  if (receiverServer) {
    return;
  }

  const host = config.receiverHost || "0.0.0.0";
  const port = Number(config.receiverPort || 8787);

  receiverServer = http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url || "/", "http://localhost");
    if (req.method !== "POST" || reqUrl.pathname !== "/triggerware") {
      jsonResponse(res, 404, { ok: false, error: "not found" });
      return;
    }

    try {
      const payload = await readJson(req);
      payload.openclaw = {
        trigger: reqUrl.searchParams.get("trigger") || undefined,
        onResult: reqUrl.searchParams.get("onResult") || undefined
      };

      if (!hasDeltas(payload)) {
        jsonResponse(res, 202, { ok: true, queued: false, reason: "no deltas" });
        return;
      }

      runOpenClawAgent(config, promptForPayload(payload));
      jsonResponse(res, 202, { ok: true, queued: true });
    } catch (error) {
      jsonResponse(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  receiverServer.on("error", (error) => {
    if (error?.code === "EADDRINUSE" || error?.code === "EPERM" || error?.code === "EACCES") {
      receiverServer = null;
      return;
    }
    throw error;
  });

  receiverServer.listen(port, host);
}

async function withTriggerwareClient(config, fn) {
  const { TriggerwareClient } = await import("triggerware");
  const client = await TriggerwareClient.connectTcp(String(config.triggerwareAddress || "localhost:5221"));
  try {
    return await fn(client);
  } finally {
    await client.close().catch(() => {});
  }
}

function triggerPrompt(params, webhookUrl) {
  return [
    params.prompt,
    "",
    "Delivery requirement:",
    `When this trigger produces deltas, send them to this webhook: ${webhookUrl}`
  ].join("\n");
}

async function createTrigger(params, config) {
  const url = new URL(getPublicWebhookUrl(config));
  url.searchParams.set("trigger", params.name);
  url.searchParams.set("onResult", params.onResult);
  const webhookUrl = url.toString();
  const prompt = triggerPrompt(params, webhookUrl);

  await withTriggerwareClient(config, async (client) => {
    await client.triggers.create(params.name, { prompt });
  });

  return {
    trigger: { name: params.name },
    webhookUrl,
    onResult: params.onResult
  };
}

async function deleteTrigger(params, config) {
  await withTriggerwareClient(config, async (client) => {
    const trigger = await client.triggers.get(params.name);
    await trigger.delete();
  });
  return { trigger: { name: params.name } };
}

function resolvePluginConfig(api, ctx) {
  const runtimeConfig = ctx?.getRuntimeConfig?.() ?? ctx?.runtimeConfig ?? ctx?.config ?? api.config ?? {};
  return runtimeConfig?.plugins?.entries?.triggerware?.config ?? runtimeConfig;
}

function createTriggerwareTool(config) {
  return {
    name: START_TOOL_NAME,
    label: "Triggerware Start Monitor",
    description: "Create a local Triggerware trigger and configure webhook delivery back into OpenClaw for future deltas.",
    parameters: startToolParameters,
    async execute(_id, params) {
      const result = await createTrigger(params, config);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: true,
              trigger: result.trigger,
              webhookUrl: result.webhookUrl,
              onResult: result.onResult
            }, null, 2)
          }
        ]
      };
    }
  };
}

function deleteTriggerwareTool(config) {
  return {
    name: DELETE_TOOL_NAME,
    label: "Triggerware Delete Monitor",
    description: "Delete a local Triggerware trigger.",
    parameters: deleteToolParameters,
    async execute(_id, params) {
      const result = await deleteTrigger(params, config);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ ok: true, ...result }, null, 2)
          }
        ]
      };
    }
  };
}

export default definePluginEntry({
  id: "triggerware",
  name: "Triggerware",
  description: "Create local Triggerware triggers and route trigger deltas back into OpenClaw.",
  register(api) {
    const config = resolvePluginConfig(api);
    startReceiver(config);

    api.registerTool((ctx) => createTriggerwareTool(resolvePluginConfig(api, ctx)), { names: [START_TOOL_NAME] });
    api.registerTool((ctx) => deleteTriggerwareTool(resolvePluginConfig(api, ctx)), { names: [DELETE_TOOL_NAME] });
  }
});
