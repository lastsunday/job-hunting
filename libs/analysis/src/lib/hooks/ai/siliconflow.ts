import { createBody, MatchResult } from './index.js';

export interface Message {
  role: string;
  content: string;
  reasoning_content: string;
}

export interface Choice {
  index: number;
  message: Message;
  finish_reason: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResult {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Choice[];
  usage: Usage;
  system_fingerprint: string;
}

export function useSiliconflow() {
  const analyze = async ({
    url = 'https://api.siliconflow.cn',
    model = 'deepseek-ai/DeepSeek-R1-Distill-Llama-8B',
    hr = '',
    demand = '',
    resume = '',
    token = '',
    getResponse = (
      url: string,
      body: string | object,
    ): Promise<{ json: () => any }> => {
      const headers = new Headers();
      headers.append(`Authorization`, `Bearer ${token}`);
      headers.append(`Content-Type`, `application/json`);
      return fetch(`${url}/v1/chat/completions`, {
        method: 'POST',
        body:
          body.constructor === Object ? JSON.stringify(body) : (body as string),
        headers,
      });
    },
  } = {}): Promise<MatchResult> => {
    const chat = async () => {
      const response = await getResponse(
        url,
        JSON.stringify(createBody({ model, hr, demand, resume })),
      );
      const chatResult = (await response.json()) as ChatResult;
      const jsonText = chatResult.choices
        .shift()
        ?.message.content.match(/```json(?<json>[\s\S]*)```/)?.groups
        ?.json as string;
      const matchResult = JSON.parse(jsonText);
      return matchResult;
    };
    return await chat();
  };

  return { analyze };
}
