import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function Course() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [videos, setVideos] = useState([]);
    const [currentVideo, setCurrentVideo] = useState(null);

    useEffect(() => {
        if (!id) return; // id жоқ болса серверге сұрау жібермейді
        api.get(`/courses/${id}/videos`).then(res => {
            setVideos(res.data);
            if (res.data.length > 0) setCurrentVideo(res.data[0]);
        }).catch(err => {
            console.error("Видеоларды алуда қате шықты:", err);
        });
    }, [id]);

    return (
        <div className="container" style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1 }} className="card">
                {/* Артқа қайту кнопкасын useNavigate арқылы өзгерттік */}
                <button 
                    onClick={() => navigate(-1)} 
                    style={{ background: 'transparent', color: '#3b82f6', border: 'none', padding: 0, marginBottom: 15, cursor: 'pointer', fontSize: '16px', textDecoration: 'underline' }}
                >
                    ⬅ Артқа
                </button>
                
                {currentVideo ? (
                    <div className="video-container">
                        <h2>{currentVideo.title}</h2>
                        <video 
                            key={currentVideo.url} 
                            width="100%" 
                            controls 
                            src={`http://localhost:5000${currentVideo.url}`} 
                            style={{ borderRadius: 8, marginTop: 10, background: '#000' }}
                        ></video>
                    </div>
                ) : <p>Бұл курста видео жоқ.</p>}
            </div>
            <div className="sidebar" style={{ width: 300 }}>
                <h3>Сабақтар</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {videos.map(v => (
                        <li key={v.id} style={{ marginBottom: 10, padding: 0 }}>
                            <button 
                                onClick={() => setCurrentVideo(v)} 
                                style={{ 
                                    width: '100%', 
                                    padding: '10px 15px',
                                    backgroundColor: currentVideo?.id === v.id ? '#3b82f6' : 'transparent',
                                    color: currentVideo?.id === v.id ? 'white' : '#1f2937',
                                    border: 'none',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    borderRadius: '6px'
                                }}
                            >
                                {v.title}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}