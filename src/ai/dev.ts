

'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/weakness-detector.ts';
import '@/ai/flows/weekly-planner.ts';
import '@/ai/flows/risk-analyzer.ts';
import '@/ai/flows/exam-analyzer.ts';
import '@/ai/flows/mistake-analyzer.ts';
