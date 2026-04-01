(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@mail.com', password: 'admin123' })
    });
    console.log('status', res.status);
    console.log(await res.text());
  } catch (e) { console.error(e); }
})();
