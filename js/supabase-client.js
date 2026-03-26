// Supabase client initialization
const SUPABASE_URL = 'https://gdxzerylaifqamraloqc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkeHplcnlsYWlmcWFtcmFsb3FjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDcxNDUsImV4cCI6MjA5MDEyMzE0NX0.u2Pi3kKCRo2pfp_6QbgPKFcbl911UGXHfHAFezQkHRQ';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
