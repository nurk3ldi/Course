import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { AuthContext } from '../AuthContext';

export default function Client() {
    const { logout } = useContext(AuthContext);
    const [courses, setCourses] = useState([]);

    useEffect(() => {
        api.get('/courses/my-courses').then(res => setCourses(res.data));
    }, []);

    return (
        <div className="container">
            <div className="layout-header">
                <h2>Менің курстарым</h2>
                <button onClick={logout} className="btn-danger">Шығу</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {courses.length > 0 ? (
                    courses.map(c => (
                        <div key={c.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', margin: 0 }}>
                            <div>
                                <h3 style={{ marginBottom: 10 }}>{c.title}</h3>
                                <p style={{ color: '#4b5563', marginBottom: 20 }}>
                                    {c.description || 'Бұл курстың сипаттамасы жоқ.'}
                                </p>
                            </div>
                            <Link 
                                to={`/course/${c.id}`} 
                                style={{ 
                                    display: 'block', 
                                    textAlign: 'center', 
                                    backgroundColor: '#3b82f6', 
                                    color: 'white', 
                                    padding: '10px', 
                                    borderRadius: '6px', 
                                    textDecoration: 'none' 
                                }}
                            >
                                Курсты көру
                            </Link>
                        </div>
                    ))
                ) : (
                    <p>Сізге әзірге ешқандай курсқа рұқсат берілмеген.</p>
                )}
            </div>
        </div>
    );
}