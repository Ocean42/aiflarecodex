import type { Response } from "openai/resources/responses/responses.mjs";

type ResponseContentPart = {
  type: string;
  [key: string]: unknown;
};

type ResponseItemType = {
  type: string;
  id?: string;
  status?: string;
  role?: string;
  content?: Array<ResponseContentPart>;
  [key: string]: unknown;
};

export type WireResponseEvent =
  | {
      type: "response.created";
      response: Partial<Response>;
    }
  | {
      type: "response.in_progress";
      response: Partial<Response>;
    }
  | {
      type: "response.output_item.added";
      output_index: number;
      item: ResponseItemType;
    }
  | {
      type: "response.content_part.added";
      item_id: string;
      output_index: number;
      content_index: number;
      part: ResponseContentPart;
    }
  | {
      type: "response.output_text.delta";
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string;
    }
  | {
      type: "response.output_text.done";
      item_id: string;
      output_index: number;
      content_index: number;
      text: string;
    }
  | {
      type: "response.function_call_arguments.delta";
      item_id: string;
      output_index: number;
      content_index: number;
      delta: string;
    }
  | {
      type: "response.function_call_arguments.done";
      item_id: string;
      output_index: number;
      content_index: number;
      arguments: string;
    }
  | {
      type: "response.content_part.done";
      item_id: string;
      output_index: number;
      content_index: number;
      part: ResponseContentPart;
    }
  | {
      type: "response.output_item.done";
      output_index: number;
      item: ResponseItemType;
    }
  | {
      type: "response.reasoning_summary_text.delta";
      summary_index: number;
      delta: string;
    }
  | {
      type: "response.reasoning_text.delta";
      content_index: number;
      delta: string;
    }
  | {
      type: "response.reasoning_summary_part.added";
      summary_index: number;
    }
  | {
      type: "response.completed";
      response: Response;
    }
  | {
      type: "error";
      code: string;
      message: string;
      param: string | null;
    };
