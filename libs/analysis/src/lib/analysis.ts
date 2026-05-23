import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Source, useAnalysis } from './hooks/analysis.js';
import { styleMap } from 'lit/directives/style-map.js';
import { convertEmptyStringToUndefined } from './utils.js';
import { RulesMatch } from './hooks/ai/index.js';
const { analyze } = useAnalysis();

export const defaultPrompt = `# Role: 资深HR专家## 目标：- 分析职位需求与候选人简历的匹配度 - 输出严格遵循以下规则：- 返回结果为Markdown JSON代码块,其格式严格遵循{matchValue:number,rulesMatch:Array,thinking:string}；- 匹配度的键为matchValue取值范围为0到100；以键为rulesMatch显示匹配的点并且格式为{demand:string,resume:string}且不能为空，demand为职位要求,resume为简历提到的点；以键为thinking显示思考过程；`;

@customElement('job-analysis-element')
export class JobAnalysisElement extends LitElement {
  static override get styles() {
    return css`
      div {
        border-radius: 5px;
        padding-left: 3px;
        padding-right: 3px;
        cursor: pointer;
        font-weight: bolder;
        margin-left: 4px;
        color: white;
      }
      .retry {
        background-color: black;
        outline: 4px double black;
        box-shadow: 0px 0px 11px 2px black;
      }
      .can_click {
        background-color: mediumblue;
        outline: 4px double mediumblue;
        box-shadow: 0px 0px 11px 2px mediumblue;
      }
      .loading {
        background-color: black;
        outline: 4px double black;
        box-shadow: 0px 0px 11px 2px black;
      }
    `;
  }

  @property({ type: String })
  source: Source = Source.OLLAMA;

  @property({ type: String })
  url?: string;

  @property({ type: String })
  token?: string;

  @property({ type: String })
  model?: string;

  @property({ type: String })
  demand?: string;

  @property({ type: String })
  resume?: string;

  @property({ type: Boolean })
  auto?: boolean;

  @property({ type: Function })
  getResponse?: (
    url: string,
    body: string | object,
  ) => Promise<{
    json: () => object;
  }>;

  @state()
  private _matchValue?: number;

  @state()
  private _rulesMatch?: RulesMatch[];

  @state()
  private _thinking?: string;

  @state()
  private _loading = true;

  @state()
  private _error = false;

  @state()
  private _error_message?: string;

  @state()
  private _firstLoad = true;

  @state()
  private _resultStyle = {};

  _fetchData = async () => {
    this._firstLoad = false;
    this._loading = true;
    this._error = false;
    this._error_message = '';
    try {
      const result = await analyze({
        source: this.source,
        url: convertEmptyStringToUndefined(this.url),
        token: convertEmptyStringToUndefined(this.token),
        model: convertEmptyStringToUndefined(this.model),
        hr: defaultPrompt,
        demand: this.demand,
        resume: this.resume,
        getResponse: this.getResponse,
      });
      const { matchValue, thinking, rulesMatch } = result;
      this._matchValue = matchValue;
      this._thinking = thinking;
      this._rulesMatch = rulesMatch;
      this._resultStyle = {
        'background-color': this._getColorByMatchValue(this._matchValue),
        outline: `4px double ${this._getColorByMatchValue(this._matchValue)}`,
        'box-shadow': `0px 0px 11px 2px ${this._getColorByMatchValue(this._matchValue)}`,
      };
    } catch (e: any) {
      //TODO
      console.error(e);
      this._error_message = e.toString();
      this._error = true;
    } finally {
      this._loading = false;
    }
  };

  _format_rules(rules: RulesMatch[]) {
    let result = '';
    for (let i = 0; i < rules.length; i++) {
      let rule = rules[i];
      result = result.concat(`📜${i + 1}: ${rule.demand}\n✨ ${rule.resume}\n`);
    }
    return result;
  }

  _getColorByMatchValue = (value: number | undefined) => {
    if (value == undefined) return 'black';
    if (value >= 80) {
      return 'yellowgreen';
    } else if (value >= 70) {
      return 'green';
    } else if (value >= 60) {
      return 'orange';
    } else if (value >= 50) {
      return 'red';
    } else {
      return 'gray';
    }
  };

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.auto) {
      this._fetchData();
    }
  }

  override render() {
    if (this._firstLoad && !this.auto) {
      return html`<div class="can_click" @click="${this._fetchData}">
        💭点击职位分析
      </div>`;
    } else {
      return this._loading
        ? html`<div class="loading">💭职位分析中⌛︎</div>`
        : this._error
          ? html`<div
              title="错误[error]: ${this._error_message}
"
              class="retry"
              @click="${this._fetchData}"
            >
              💭职位分析失败，点击重试
              <span
                title="类型[source]: ${this.source}
地址[url]: ${this.url}
提示词[prompt]: ${defaultPrompt} 
模型[model]: ${this.model}
需求[demand]: ${this.demand}
简历[resume]: ${this.resume}
"
                >🔧</span
              >
            </div>`
          : html`<div
              title="思考[thinking]: ${this._thinking}
匹配规则[rules]:
${this._format_rules(this._rulesMatch!)}
"
              style=${styleMap(this._resultStyle)}
            >
              💭职位匹配度:${this._matchValue}分<span
                title="类型[source]: ${this.source}
地址[url]: ${this.url}
提示词[prompt]: ${defaultPrompt} 
模型[model]: ${this.model}
需求[demand]: ${this.demand}
简历[resume]: ${this.resume}
"
                >🔧</span
              >
            </div>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'job-analysis-element': JobAnalysisElement;
  }
}
