import { createBody, defaultHrDesc, MatchResult } from "./index.js";

export interface Message {
  role: string;
  content: string;
}

export interface Choice {
  index: number;
  message: Message;
  logprobs?: any;
  finish_reason: string;
}

export interface Completion_tokens_detail {
  reasoning_tokens: number;
  accepted_prediction_tokens: number;
  rejected_prediction_tokens: number;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  completion_tokens_details: Completion_tokens_detail;
}

export interface ChatResult {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Choice[];
  usage: Usage;
}

export function useOpenai() {

  const analyze = async ({ url = "http://127.0.0.1:1234", model = "mradermacher/DeepSeek-R1-Distill-Llama-8B-Abliterated-GGUF", hr = defaultHrDesc, demand = '', resume = '', token = '', getResponse = (url: string, body: string | object): Promise<{ json: () => object }> => {
    const headers = new Headers();
    headers.append(`Authorization`, `Bearer ${token}`);
    headers.append(`Content-Type`, `application/json`);
    return fetch(`${url}/v1/chat/completions`, {
      method: "POST", body: body.constructor === Object ? JSON.stringify(body) : body as string, headers
    });
  } } = {}): Promise<MatchResult> => {
    const chat = async () => {
      const response = await getResponse(url, JSON.stringify(createBody({ model, hr, demand, resume })));
      const chatResult = await response.json() as ChatResult
      const jsonText = (chatResult.choices.shift()?.message.content.match(/```json(?<json>[\s\S]*)```/)?.groups?.json) as string;
      const matchResult = JSON.parse(jsonText);
      return matchResult;
    }
    return await chat();
  }

  return { analyze }
}
