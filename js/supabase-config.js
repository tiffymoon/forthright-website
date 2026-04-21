// ════════════════════════════════════════════
// FORTHRIGHT EVENTS — Supabase Config
// ════════════════════════════════════════════

const SUPABASE_URL  = 'https://sjncqciksllyvypivehi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqbmNxY2lrc2xseXZ5cGl2ZWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY3NjUzODEsImV4cCI6MjA5MjM0MTM4MX0.lUjPIHHNfAsgaFW2MAKA-H2_-pLN2OLeZ-g3iBtpi88';

// Supabase JS client (loaded via CDN in HTML)
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
