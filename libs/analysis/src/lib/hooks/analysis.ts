import { useOllama } from "./ai.js";
import { MatchResult, Source } from "./index.js";

const { analyze: analyzeByOllama } = useOllama();

export function useAnalysis() {

  const sourceMap = new Map<Source, ({ url, model, hr, demand, resume }: {
    url?: string;
    model?: string;
    hr?: string;
    demand?: string;
    resume?: string;
  }) => Promise<MatchResult>>();

  sourceMap.set(Source.OLLAMA, analyzeByOllama);

  const analyze = async ({ source, url, model, hr, demand, resume }: {
    source: Source;
    url?: string;
    model?: string;
    hr?: string;
    demand?: string;
    resume?: string;
  }): Promise<MatchResult> => {
    const targetFunction = sourceMap.get(source);
    if (targetFunction) {
      return targetFunction({ url, model, hr, demand, resume });
    } else {
      throw `unsupport source ${source}`;
    }
  }

  return { analyze }
}