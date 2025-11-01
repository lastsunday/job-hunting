import { useExtension } from "./ai/extension.js";
import { MatchResult } from "./ai/index.js";
import { useOllama } from "./ai/ollama.js";
import { useOpenai } from "./ai/openai.js";
import { useSiliconflow } from "./ai/siliconflow.js";

export enum Source {
  OPENAI = 'OPENAI',
  OLLAMA = 'OLLAMA',
  SILICONFLOW = 'SILICONFLOW',
  EXTENSION = 'EXTENSION',
}

export function useAnalysis() {

  const sourceMap = new Map<Source, ({ url, model, hr, demand, resume }: {
    url?: string;
    model?: string;
    token?: string;
    hr?: string;
    demand?: string;
    resume?: string;
    getResponse?: (url: string, body: string | object) => Promise<{ json: () => object }>;
  }) => Promise<MatchResult>>();

  sourceMap.set(Source.OLLAMA, useOllama().analyze);
  sourceMap.set(Source.OPENAI, useOpenai().analyze);
  sourceMap.set(Source.SILICONFLOW, useSiliconflow().analyze);
  sourceMap.set(Source.EXTENSION, useExtension().analyze);

  const analyze = async ({ source, url, token, model, hr, demand, resume, getResponse }: {
    source: Source;
    url?: string;
    token?: string;
    model?: string;
    hr?: string;
    demand?: string;
    resume?: string;
    getResponse?: (url: string, body: string | object) => Promise<{ json: () => object }>;
  }): Promise<MatchResult> => {
    const targetFunction = sourceMap.get(source);
    if (targetFunction) {
      return targetFunction({ url, model, token, hr, demand, resume, getResponse });
    } else {
      throw `unsupport source ${source}`;
    }
  }

  return { analyze }
}
