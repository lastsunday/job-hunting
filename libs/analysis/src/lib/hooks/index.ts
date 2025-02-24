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

export interface RulesMatch {
    demand: string;
    resume: string;
}

export interface MatchResult {
    matchValue: number;
    rulesMatch: RulesMatch[];
    thinking: string;
}

export enum Source{
    OLLAMA
}