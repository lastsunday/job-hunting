import { Meta, StoryObj } from '@storybook/react';
import { JobAnalysisComponent } from './JobAnalysisComponent';
import { Source } from '../hooks/analysis';

const meta = {
    component: JobAnalysisComponent,
    title: 'JobAnalysisComponent',
    tags: ['autodocs'],
    args: {
        auto: false,
        source: undefined,
        url: undefined,
        token: undefined,
        model: undefined,
        demand: undefined,
        resume: undefined,
    },
    argTypes: {
        auto: { control: 'boolean', description: 'Automatically analyze the resume and job demand when the component is mounted' },
        source: { options: Object.keys(Source), control: { type: 'select', }, description: 'The source of the ai' },
        url: { control: 'text', description: 'The url of the ai' },
        token: { control: 'text', description: 'The token of the ai' },
        model: { control: 'text', description: 'The model of the ai' },
        demand: { control: 'text', description: 'The demand of the job' },
        resume: { control: 'text', description: 'The resume of the people' },
    }

} satisfies Meta<typeof JobAnalysisComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {

};

