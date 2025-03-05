import React from 'react';
import { createComponent } from '@lit/react';
import { JobAnalysisElement } from '../analysis.js';

export const JobAnalysisComponent = createComponent({
  tagName: 'job-analysis-element',
  elementClass: JobAnalysisElement,
  react: React,
});