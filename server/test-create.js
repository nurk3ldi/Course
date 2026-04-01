(async () => {
  try {
    const login = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ email: 'admin@mail.com', password: 'admin123'})
    });
    const data = await login.json();
    console.log('token', data.token);
    const create = await fetch('http://localhost:5000/api/courses', {
      method: 'POST', headers: {'Content-Type':'application/json', 'Authorization': `Bearer ${data.token}`},
      body: JSON.stringify({title:'Test Course', description:'desc', price: 10})
    });
    console.log('course status', create.status);
    console.log(await create.text());
  } catch(e){console.error(e)}
})();
