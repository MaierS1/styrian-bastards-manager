const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

const missingEnvVars = requiredEnvVars.filter((name) => {
  const value = process.env[name];
  return !value || value.trim() === '';
});

if (missingEnvVars.length > 0) {
  console.error('Build failed: missing required environment variables.');
  console.error(`Please set: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}
