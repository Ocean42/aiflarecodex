import type { OverlayModeType } from "./terminal-chat.js";
import type { TerminalHeaderProps } from "./terminal-header.js";
import type { GroupedResponseItem } from "./use-message-grouping.js";
import type { AgentResponseItem } from "../../utils/agent/agent-events.js";
import type { FileOpenerScheme } from "src/utils/config.js";

import TerminalChatResponseItem from "./terminal-chat-response-item.js";
import TerminalHeader from "./terminal-header.js";
import { Box, Static } from "ink";
import React, { useMemo } from "react";
import { isNativeResponseItem } from "../../utils/agent/agent-events.js";

// A batch entry can either be a standalone response item or a grouped set of
// items (e.g. auto‑approved tool‑call batches) that should be rendered
// together.
type BatchEntry = { item?: AgentResponseItem; group?: GroupedResponseItem };
type TerminalMessageHistoryProps = {
  batch: Array<BatchEntry>;
  groupCounts: Record<string, number>;
  items: Array<AgentResponseItem>;
  userMsgCount: number;
  confirmationPrompt: React.ReactNode;
  loading: boolean;
  thinkingSeconds: number;
  headerProps: TerminalHeaderProps;
  fullStdout: boolean;
  setOverlayMode: React.Dispatch<React.SetStateAction<OverlayModeType>>;
  fileOpener: FileOpenerScheme | undefined;
};

const TerminalMessageHistory: React.FC<TerminalMessageHistoryProps> = ({
  batch,
  headerProps,
  // `loading` and `thinkingSeconds` handled by input component now.
  loading: _loading,
  thinkingSeconds: _thinkingSeconds,
  fullStdout,
  setOverlayMode,
  fileOpener,
}) => {
  // Flatten batch entries to response items.
  const messages = useMemo(
    () => batch.map(({ item }) => item!).filter(Boolean),
    [batch],
  );

  return (
    <Box flexDirection="column">
      {/* The dedicated thinking indicator in the input area now displays the
          elapsed time, so we no longer render a separate counter here. */}
      <Static items={["header", ...messages]}>
        {(item, index) => {
          if (item === "header") {
            return <TerminalHeader key="header" {...headerProps} />;
          }

          const message = item as AgentResponseItem;
          if (
            isNativeResponseItem(message) &&
            message.type === "reasoning" &&
            Array.isArray((message as { summary?: Array<unknown> }).summary) &&
            ((message as { summary?: Array<unknown> }).summary?.length ?? 0) ===
              0
          ) {
            return null;
          }
          return (
            <Box
              key={`${(message as { id?: string }).id ?? index}-${index}`}
              flexDirection="column"
              marginLeft={
                isNativeResponseItem(message) &&
                message.type === "message" &&
                ((message as { role?: string }).role === "user" ||
                  (message as { role?: string }).role === "assistant")
                  ? 0
                  : 4
              }
              marginTop={
                isNativeResponseItem(message) &&
                message.type === "message" &&
                (message as { role?: string }).role === "user"
                  ? 0
                  : 1
              }
              marginBottom={
                isNativeResponseItem(message) &&
                message.type === "message" &&
                (message as { role?: string }).role === "assistant"
                  ? 1
                  : 0
              }
            >
              <TerminalChatResponseItem
                item={message}
                fullStdout={fullStdout}
                setOverlayMode={setOverlayMode}
                fileOpener={fileOpener}
              />
            </Box>
          );
        }}
      </Static>
    </Box>
  );
};

export default React.memo(TerminalMessageHistory);
