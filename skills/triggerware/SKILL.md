---
name: triggerware
description: Create local Triggerware polling triggers and route their results back through OpenClaw.
---

When the user asks to use Triggerware to poll, monitor, watch, create a trigger, or take an action when Triggerware returns data, you MUST use the `triggerware_start_monitor` tool.

When the user asks to delete, stop, remove, or cancel a Triggerware monitor/trigger, you MUST use the `triggerware_delete_monitor` tool.

For `triggerware_start_monitor`, pass:
- `name`: a short unique trigger name.
- `prompt`: the user's requested monitoring operation, including the data to watch and the schedule.
- `onResult`: what the user wants OpenClaw to do when the trigger returns data. Preserve the requested destination or decision logic.

For `triggerware_delete_monitor`, pass:
- `name`: the existing Triggerware trigger name.

The tool creates a local Triggerware trigger. It adds webhook delivery instructions to the prompt before sending it to Triggerware. When Triggerware sends result deltas, this plugin starts an OpenClaw agent turn so OpenClaw can inspect the payload and follow `onResult`.

After the tool succeeds, tell the user that the trigger has been created and that future matching results will arrive asynchronously through the configured webhook.
