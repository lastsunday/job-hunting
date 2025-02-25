import { LitElement, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { useAnalysis } from './hooks/analysis.js';
import { Source } from './hooks/index.js';
const { analyze } = useAnalysis();

@customElement('job-analysis-element')
export class JobAnalysisElement extends LitElement {

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

  @property({ type: Function })
  getResponse?: (url: string, bodyString: string) => Promise<{
    json: () => object;
  }>;

  @state()
  private _matchValue?: number;

  @state()
  private _thinking?: string;

  @state()
  private _loading = true;

  @state()
  private _error = false;

  fetchData = async () => {
    this._loading = true;
    this._error = false;
    try {
      const result = await analyze({ source: this.source, url: this.url, token: this.token, model: this.model, demand: this.demand, resume: this.resume, getResponse: this.getResponse });
      const { matchValue, thinking } = result;
      this._matchValue = matchValue;
      this._thinking = thinking;
    } catch (e) {
      //TODO
      console.error(e);
      this._error = true;
    } finally {
      this._loading = false;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.fetchData();
  }

  override render() {
    return this._loading
      ? html`<div>职位分析中...</div>`
      : (this._error ? html`<div @onclick="${this.fetchData}">分析失败，点击重试</div>` : html`<div title="${this._thinking}">匹配度:${this._matchValue}分</div>`);
  }
}