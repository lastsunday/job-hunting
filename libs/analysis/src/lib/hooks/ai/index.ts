export const createBody = ({
  model = '',
  hr = '',
  demand = '',
  resume = '',
} = {}) => {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content: hr,
      },
      {
        role: 'user',
        content: `职位要求:${demand}\n;候选人简历:${resume}\n`,
      },
    ],
    stream: false,
  };
  return body;
};

export interface RulesMatch {
  demand: string;
  resume: string;
}

export interface MatchResult {
  matchValue: number;
  rulesMatch: RulesMatch[];
  thinking: string;
}

