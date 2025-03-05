import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { Source, useAnalysis } from './hooks/analysis.js';
import { styleMap } from 'lit/directives/style-map.js';
const { analyze } = useAnalysis();

@customElement('job-analysis-element')
export class JobAnalysisElement extends LitElement {

  static override get styles() {
    return css`
      div{
          border-radius: 5px;
          padding-left: 3px;
          padding-right: 3px;
          cursor: pointer;
          font-weight: bolder;
          margin-left: 4px;
          color: white;
      }
      .retry {
        background-color:black;
        outline: 4px double black;
        box-shadow: 0px 0px 11px 2px black;
      }
      .can_click {
        background-color: mediumblue;
        outline: 4px double mediumblue;
        box-shadow: 0px 0px 11px 2px mediumblue;
      }
      .loading {
        background-color:black;
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

  @state()
  private _firstLoad = true;

  @state()
  private _resultStyle = {};

  _fetchData = async () => {
    this._firstLoad = false;
    this._loading = true;
    this._error = false;
    try {
      const result = await analyze({ source: this.source, url: this.url, token: this.token, model: this.model, demand: this.demand, resume: this.resume, getResponse: this.getResponse });
      const { matchValue, thinking } = result;
      this._matchValue = matchValue;
      this._thinking = thinking;
      this._resultStyle = {
        'background-color': this._getColorByMatchValue(this._matchValue),
        'outline': `4px double ${this._getColorByMatchValue(this._matchValue)}`,
        'box-shadow': `0px 0px 11px 2px ${this._getColorByMatchValue(this._matchValue)}`
      };
    } catch (e) {
      //TODO
      console.error(e);
      this._error = true;
    } finally {
      this._loading = false;
    }
  }

  _getColorByMatchValue = (value: number | undefined) => {
    if (value == undefined) return "black";
    if (value >= 80) {
      return "yellowgreen";
    } else if (value >= 70) {
      return "green";
    } else if (value >= 60) {
      return "orange";
    } else if (value >= 50) {
      return "red";
    } else {
      return "gray";
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.auto) {
      this._fetchData();
    }
  }

  override render() {
    if (this._firstLoad && !this.auto) {
      return html`<div class="can_click" @click="${this._fetchData}">💭点击职位分析</div>`
    } else {
      return this._loading
        ? html`<div class="loading">💭职位分析中⌛︎</div>`
        : (this._error ? html`<div class="retry" @click="${this._fetchData}">💭职位分析失败，点击重试</div>` : html`<div title="${this._thinking}" style=${styleMap(this._resultStyle)} >💭职位匹配度:${this._matchValue}分</div>`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'job-analysis-element': JobAnalysisElement;
  }
}
