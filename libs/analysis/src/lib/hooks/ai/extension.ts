import { createBody, MatchResult } from './index.js';

export interface ChatResult {
  choices: Array<Choice>;
}

export interface Choice {
  message: Message;
}

export interface Message {
  content: string;
  role: string;
}

export function useExtension() {
  const analyze = async ({
    url = '',
    model = '',
    hr = '',
    demand = '',
    resume = '',
    getResponse = (
      url: string,
      body: string | object,
    ): Promise<{ json: () => any }> => {
      throw 'need pass getResponse method';
    },
  } = {}): Promise<MatchResult> => {
    const chat = async () => {
      const response = await getResponse(
        url,
        createBody({ model, hr, demand, resume }),
      );
      const chatResult = (await response.json()) as ChatResult;
      let jsonText = '{}';
      const content = chatResult?.choices[0]?.message.content;
      let matchResult = JSON.parse('{}');
      if (content) {
        try {
          jsonText = content.match(/```json(?<json>[\s\S]*)```/)?.groups
            ?.json as string;
          matchResult = JSON.parse(jsonText);
        } catch (e) {
          // fix Qwen3-1.7B-q4f32_1-MLC
          // no ```json ``` tag
          try {
            jsonText = content.match(/<think>[\s\S]*<\/think>(?<json>[\s\S]*)/)
              ?.groups?.json as string;
            matchResult = JSON.parse(jsonText);
          } catch (e) {
            console.error(chatResult, e);
            throw 'convert match result json failure' + e;
          }
        }
      }
      return matchResult;
    };
    return await chat();
  };

  return { analyze };
}
