import { useState, useEffect, useContext, useRef } from 'react';
import api from '../api';
import { AuthContext } from '../AuthContext';

export default function Admin() {
    const { logout } = useContext(AuthContext);
    const [courses, setCourses] = useState([]);
    const [users, setUsers] = useState([]);
    const [form, setForm] = useState({ title: '', description: '' });
    
    // Файл үшін бөлек state
    const [videoForm, setVideoForm] = useState({ course_id: '', title: '' });
    const [videoFile, setVideoFile] = useState(null);
    const fileInputRef = useRef(null);
    
    const [accessForm, setAccessForm] = useState({ user_id: '', course_id: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const resCourses = await api.get('/courses/all');
        setCourses(resCourses.data);
        const resUsers = await api.get('/users');
        setUsers(resUsers.data);
    };

    const createCourse = async (e) => {
        e.preventDefault();
        await api.post('/courses/create', form);
        fetchData();
    };

    const addVideo = async (e) => {
        e.preventDefault();
        if (!videoFile) return alert("Видео файлды таңдаңыз!");

        setLoading(true);
        const formData = new FormData();
        formData.append('course_id', videoForm.course_id);
        formData.append('title', videoForm.title);
        formData.append('video', videoFile);

        try {
            await api.post('/courses/add-video', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert('Видео сәтті жүктелді!');
            setVideoForm({ course_id: '', title: '' });
            setVideoFile(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            alert('Қате: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const grantAccess = async (e) => {
        e.preventDefault();
        await api.post('/courses/grant-access', accessForm);
        alert('Рұқсат берілді!');
    };

    return (
        <div className="container">
            <button onClick={logout} style={{ float: 'right' }}>Шығу</button>
            <h2>Админ Панелі</h2>
            
            <div className="card">
                <h3>Курс қосу</h3>
                <form onSubmit={createCourse} style={{ boxShadow: 'none', padding: 0 }}>
                    <input placeholder="Атауы" onChange={e => setForm({...form, title: e.target.value})} required />
                    <input placeholder="Сипаттамасы" onChange={e => setForm({...form, description: e.target.value})} />
                    <button type="submit">Жасау</button>
                </form>
            </div>

            <div className="card">
                <h3>Видео жүктеу</h3>
                <form onSubmit={addVideo} style={{ boxShadow: 'none', padding: 0 }}>
                    <select value={videoForm.course_id} onChange={e => setVideoForm({...videoForm, course_id: e.target.value})} required>
                        <option value="">Курсты таңдаңыз</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <input placeholder="Видео атауы" value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})} required />
                    
                    {/* Файл таңдайтын инпут */}
                    <input type="file" accept="video/*" ref={fileInputRef} onChange={e => setVideoFile(e.target.files[0])} required />
                    
                    <button type="submit" disabled={loading}>
                        {loading ? 'Жүктелуде...' : 'Жүктеу'}
                    </button>
                </form>
            </div>

            <div className="card">
                <h3>Рұқсат беру</h3>
                <form onSubmit={grantAccess} style={{ boxShadow: 'none', padding: 0 }}>
                    <select onChange={e => setAccessForm({...accessForm, user_id: e.target.value})} required>
                        <option value="">Студентті таңдаңыз</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.email}</option>)}
                    </select>
                    <select onChange={e => setAccessForm({...accessForm, course_id: e.target.value})} required>
                        <option value="">Курсты таңдаңыз</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <button type="submit">Рұқсат беру</button>
                </form>
            </div>
        </div>
    );
}