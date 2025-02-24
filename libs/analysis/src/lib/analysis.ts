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
  model?: string;

  @property({ type: String })
  demand?: string;

  @property({ type: String })
  resume?: string;

  @state()
  private _matchValue?: number;

  @state()
  private _loading = true;

  override connectedCallback(): void {
    super.connectedCallback();
    const fetchData = async () => {
      const result = await analyze({ source: this.source, url: this.url, model: this.model, demand: this.demand, resume: this.resume });
      const { matchValue } = result;
      this._matchValue = matchValue;
      this._loading = false;
    }
    fetchData();
  }

  override render() {
    return this._loading
      ? html`<div>职位分析中...</div>`
      : html`<div>匹配度:${this._matchValue}分</div>`;
  }
}