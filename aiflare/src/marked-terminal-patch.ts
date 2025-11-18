import TerminalRenderer from "marked-terminal";

// Apply local patches that were originally maintained via pnpm's
// `patchedDependencies` for marked-terminal@7.3.0. This makes the
// behavior of the Markdown renderer match what the tests expect,
// without modifying files under node_modules directly.

let patched = false;

export function patchMarkedTerminal(): void {
  if (patched) {
    return;
  }
  patched = true;

  const rendererProto = (TerminalRenderer as unknown as { prototype: any })
    .prototype;

  if (!rendererProto) {
    return;
  }

  // Patch Renderer.prototype.text:
  // If `text` is a token object, render its inline tokens instead of
  // just taking the raw `text` field. This is equivalent to:
  //
  //   if (typeof text === 'object') {
  //     text = text.tokens ? this.parser.parseInline(text.tokens) : text.text;
  //   }
  //
  const originalText = rendererProto.text;
  rendererProto.text = function patchedText(text: unknown): string {
    if (typeof text === "object" && text !== null) {
      const obj = text as { text?: string; tokens?: unknown[] };
      if (obj.tokens && this.parser && typeof this.parser.parseInline === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        text = this.parser.parseInline(obj.tokens);
      } else if (typeof obj.text === "string") {
        text = obj.text;
      } else {
        text = "";
      }
    }

    if (!this.o || typeof this.o.text !== "function") {
      return typeof originalText === "function"
        ? // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          originalText.call(this, text)
        : String(text);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    return this.o.text(text);
  };

  // Patch Renderer.prototype.listitem to avoid re-applying the listitem /
  // transform styling when rendering nested list items. This mirrors the
  // behavior from the original pnpm patch:
  //
  //   var transform = compose(this.o.listitem, this.transform);
  //   var isNested = text.indexOf('\n') !== -1;
  //   if (!isNested) text = transform(text);
  //
  //   // Use BULLET_POINT as a marker for ordered or unordered list item
  //   return '\n' + BULLET_POINT + text;
  //
  const BULLET_POINT = "* ";

  rendererProto.listitem = function patchedListitem(text: unknown): string {
    let currentText = text as unknown;

    if (typeof currentText === "object" && currentText !== null) {
      const item = currentText as {
        task?: boolean;
        checked?: boolean;
        loose?: boolean;
        tokens: Array<unknown>;
      };

      let built = "";
      if (item.task) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-call
        const checkbox = this.checkbox({ checked: !!item.checked });
        if (item.loose) {
          if (
            item.tokens.length > 0 &&
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            (item.tokens[0] as { type?: string }).type === "paragraph"
          ) {
            const first = item.tokens[0] as {
              text?: string;
              tokens?: Array<{ type?: string; text?: string }>;
            };
            first.text = `${checkbox} ${first.text ?? ""}`;
            if (
              first.tokens &&
              first.tokens.length > 0 &&
              first.tokens[0] &&
              first.tokens[0].type === "text"
            ) {
              first.tokens[0].text = `${checkbox} ${first.tokens[0].text ?? ""}`;
            }
          } else {
            item.tokens.unshift({
              type: "text",
              raw: `${checkbox} `,
              text: `${checkbox} `,
            });
          }
        } else {
          built += `${checkbox} `;
        }
      }

      if (this.parser && typeof this.parser.parse === "function") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
        built += this.parser.parse(item.tokens, !!item.loose);
      }

      currentText = built;
    }

    let textStr = String(currentText);
    const isNested = textStr.includes("\n");

    if (!isNested && this.o && typeof this.o.listitem === "function" && typeof this.transform === "function") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      textStr = this.o.listitem(this.transform(textStr));
    }

    return `\n${BULLET_POINT}${textStr}`;
  };
}

