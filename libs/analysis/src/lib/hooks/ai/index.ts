export const defaultHrDesc = `# Role: 资深HR专家## 目标：- 分析职位需求与候选人简历的匹配度 - 输出严格遵循以下规则：- 返回结果为JSON,其格式严格遵循{matchValue:number,rulesMatch:Array,thinking:string}；- 匹配度的键为matchValue取值范围为0到100；以键为rulesMatch显示匹配的点并且格式为{demand:string,resume:string}且不能为空，demand为职位要求,resume为简历提到的点；以键为thinking显示思考过程；`;

export const createBody = ({ model = '', hr = '', demand = '', resume = '' } = {}) => {
    const body = {
        model,
        "messages": [
            {
                "role": "system",
                "content": hr,
            },
            {
                "role": "user",
                "content": `职位要求:${demand}\n;候选人简历:${resume}\n`
            }
        ],
        "stream": false
    }
    return body;
}

export interface RulesMatch {
    demand: string;
    resume: string;
}

export interface MatchResult {
    matchValue: number;
    rulesMatch: RulesMatch[];
    thinking: string;
}