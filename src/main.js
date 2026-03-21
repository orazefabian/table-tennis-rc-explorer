import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';
import { injectSpeedInsights } from '@vercel/speed-insights';
import { inject } from '@vercel/analytics';

inject();
injectSpeedInsights();

const app = mount(App, { target: document.getElementById('app') });

export default app;
