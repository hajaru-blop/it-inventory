// js/config.js
const SUPABASE_URL = 'https://frqdhwvigszahanvycit.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZycWRod3ZpZ3N6YWhhbnZ5Y2l0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MTk4NzksImV4cCI6MjEwNjQ5NTg3OX0.UoeSUqUOgREejHvQedQreqMAib5usqn88OVyaTK7Gnk';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function protectPage() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const currentPage = window.location.pathname;

  const isProtectedPage = currentPage.includes('dashboard.html') || currentPage.includes('inventory.html');
  const isAuthPage = currentPage.includes('index.html') || currentPage === '/' || currentPage.endsWith('/');

  if (!session && isProtectedPage) {
    window.location.href = 'index.html';
  } else if (session && isAuthPage) {
    window.location.href = 'dashboard.html';
  }

  if (session && document.getElementById('user-display')) {
    document.getElementById('user-display').innerText = session.user.email;
  }
}

async function handleSignOut() {
  await supabaseClient.auth.signOut();
  window.location.href = 'index.html';
}

protectPage();
