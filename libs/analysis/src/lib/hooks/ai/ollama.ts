import { createBody, MatchResult } from './index.js';

export interface Message {
  content: string;
  role: string;
}

export interface ChatResult {
  created_at: string;
  done: boolean;
  done_reason: string;
  eval_count: number;
  eval_duration: number;
  load_duration: number;
  message: Message;
  model: string;
  prompt_eval_count: number;
  prompt_eval_duration: number;
  total_duration: number;
}

export function useOllama() {
  const analyze = async ({
    url = 'http://localhost:11434',
    model = 'deepseek-r1:7b',
    hr = '',
    demand = '',
    resume = '',
    getResponse = (
      url: string,
      body: string | object,
    ): Promise<{ json: () => any }> => {
      return fetch(`${url}/api/chat`, {
        method: 'POST',
        body:
          body.constructor === Object ? JSON.stringify(body) : (body as string),
      });
    },
  } = {}): Promise<MatchResult> => {
    const chat = async () => {
      const response = await getResponse(
        url,
        JSON.stringify(createBody({ model, hr, demand, resume })),
      );
      const chatResult = (await response.json()) as ChatResult;
      const jsonText = chatResult.message.content.match(
        /```json(?<json>[\s\S]*)```/,
      )?.groups?.json as string;
      const matchResult = JSON.parse(jsonText);
      return matchResult;
    };
    return await chat();
  };

  return { analyze };
}
