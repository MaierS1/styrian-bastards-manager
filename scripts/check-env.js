import { loadEnv } from 'vite';

const mode = process.env.NODE_ENV === 'production'
  ? 'production'
  : 'development';

const env = loadEnv(mode, process.cwd(), '');

const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missingEnvVars = requiredEnvVars.filter((name) => {
  const value = process.env[name] ?? env[name];
  return !value || value.trim() === '';
});

if (missingEnvVars.length > 0) {
  console.error('Build failed: missing required environment variables.');
  console.error(`Please set: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}