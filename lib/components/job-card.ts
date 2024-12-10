import { JobApi } from "@/common/api";
import { JobDTO } from '@/common/data/dto/jobDTO';
import DOMPurify from 'dompurify';
import { LitElement, PropertyValues, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { marked } from "marked";

@customElement('job-card')
class JobCard extends LitElement {

  @property({ attribute: 'job-id', type: String })
  jobId = '';

  @property({ type: JobDTO, reflect: true })
  _item: JobDTO;

  // @property({ type: String, reflect: true })
  _content: string;

  constructor() {
    super();
  }

  fetchJobInfo = async () => {
    const result = await JobApi.getJobBrowseInfoByIds([this.jobId]);
    this._item = result.length > 0 ? result[0] : null;
    this._content = await marked.parse(this._item?.jobDescription,{breaks:true,pedantic:true,});
    this.renderRoot.querySelector('#desc').innerHTML = `${DOMPurify.sanitize(this._content)}`;
  }

  firstUpdated() {
    this.fetchJobInfo();
  }

  static styles = css`
    /* div {
      color: green;
    } */
    @unocss-placeholder
  `;

  render() {
    return html`
      <div>
        <div class="font-sans">${this._item?.jobName} [${this._item?.jobLocationName}]</div>
        <div id="desc"></div>
      <div>
      
    `;
  }
}