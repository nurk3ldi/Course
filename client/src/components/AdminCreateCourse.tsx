import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const AdminCreateCourse = () => {
    const [courseData, setCourseData] = useState({ title: '', description: '', price: 0 });
    const [createdCourseId, setCreatedCourseId] = useState<number | null>(null);
    const [modules, setModules] = useState<any[]>([]);
    const [lessons, setLessons] = useState<any[]>([]);
    const [moduleData, setModuleData] = useState({ title: '', position: 1 });
    const [lessonData, setLessonData] = useState({ module_id: 0, title: '', url: '', description: '' });
    const [assignmentData, setAssignmentData] = useState({ lesson_id: 0, title: '', description: '', task_type: 'text', resource_url: '' });
    const [activeStep, setActiveStep] = useState(1);

    const authHeader = { Authorization: `Bearer ${localStorage.getItem('token')}` };

    const handleCreateCourse = async () => {
        try {
            if (!courseData.title.trim()) {
                alert('Введите название курса');
                return;
            }
            const res = await axios.post(API_URL + '/courses', courseData, { headers: authHeader });
            setCreatedCourseId(res.data.id);
            setModules([]);
            setActiveStep(2);
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Ошибка при создании курса';
            alert('Ошибка: ' + msg);
            console.error(err);
        }
    };

    const handleCreateModule = async () => {
        if (!createdCourseId) return;
        if (!moduleData.title.trim()) {
            alert('Введите название раздела');
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/courses/${createdCourseId}/modules`, moduleData, { headers: authHeader });
            setModules(prev => [...prev, res.data]);
            setModuleData({ title: '', position: (moduleData.position || 0) + 1 });
            alert('Раздел создан ✓');
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Ошибка создания раздела';
            alert('Ошибка: ' + msg);
            console.error(err);
        }
    };

    const handleAddLessonToModule = async () => {
        if (!createdCourseId || !lessonData.module_id) {
            alert('Выберите раздел для урока');
            return;
        }

        try {
            if (!lessonData.title.trim()) {
                alert('Введите название урока');
                return;
            }
            const res = await axios.post(`${API_URL}/courses/${createdCourseId}/modules/${lessonData.module_id}/lessons`, {
                title: lessonData.title,
                description: lessonData.description,
                video_url: lessonData.url,
                position: 0
            }, { headers: authHeader });

            const module = modules.find(m => m.id === lessonData.module_id);
            setLessons(prev => [...prev, { ...res.data, module_title: module ? module.title : 'Раздел' }]);
            setLessonData({ ...lessonData, title: '', url: '', description: '' });
            alert('Урок добавлен ✓');
            return res.data;
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Ошибка добавления урока';
            alert('Ошибка: ' + msg);
            console.error(err);
        }
    };

    const handleAddAssignment = async () => {
        if (!assignmentData.lesson_id) {
            alert('Выберите урок для задания');
            return;
        }

        try {
            await axios.post(API_URL + '/courses/add-assignment', {
                lesson_id: assignmentData.lesson_id,
                title: assignmentData.title,
                description: assignmentData.description,
                task_type: assignmentData.task_type,
                resource_url: assignmentData.resource_url || null
            }, { headers: authHeader });

            setAssignmentData({ ...assignmentData, title: '', description: '', resource_url: '' });
            alert('Задание создано ✓');
        } catch (err: any) {
            const msg = err.response?.data?.error || err.message || 'Ошибка создания задания';
            alert('Ошибка: ' + msg);
            console.error(err);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '12px 14px',
        borderRadius: '8px',
        border: '1px solid #d1d5db',
        fontSize: '14px',
        fontFamily: 'inherit',
        transition: 'all 0.2s ease',
        boxSizing: 'box-border' as const
    };

    const inputFocusStyle = {
        ...inputStyle,
        borderColor: '#059669',
        boxShadow: '0 0 0 3px rgba(5, 150, 105, 0.1)'
    };

    const buttonStyle = {
        padding: '12px 24px',
        borderRadius: '8px',
        border: 'none',
        fontSize: '14px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        fontFamily: 'inherit',
        background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        color: 'white',
        boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
        width: '100%'
    };

    const cardStyle = {
        background: 'white',
        borderRadius: '12px',
        padding: '28px',
        marginBottom: '20px',
        border: '1px solid #e5e7eb',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
    };

    const stepStyle = {
        display: activeStep === 1 ? 'block' as const : 'none' as const
    };

    const step2Style = {
        display: activeStep > 1 ? 'block' as const : 'none' as const
    };

    if (!createdCourseId) {
        return (
            <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
                <div style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '18px',
                            marginRight: '12px'
                        }}>📖</div>
                        <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>Создать новый курс</h2>
                    </div>
                    <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '14px', lineHeight: '1.6' }}>
                        Заполните информацию о курсе. Вы сможете добавить разделы, уроки и задания после создания.
                    </p>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Название курса *</label>
                        <input
                            type="text"
                            placeholder="Например: Web Development Basics"
                            value={courseData.title}
                            onChange={e => setCourseData({ ...courseData, title: e.target.value })}
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#059669'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Описание</label>
                        <textarea
                            placeholder="Описание курса, что студенты узнают..."
                            value={courseData.description}
                            onChange={e => setCourseData({ ...courseData, description: e.target.value })}
                            style={{...inputStyle, minHeight: '100px', resize: 'vertical'}}
                            onFocus={(e) => e.target.style.borderColor = '#059669'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Цена ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            placeholder="99.99"
                            value={courseData.price}
                            onChange={e => setCourseData({ ...courseData, price: Number(e.target.value) || 0 })}
                            style={inputStyle}
                            onFocus={(e) => e.target.style.borderColor = '#059669'}
                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                        />
                    </div>

                    <button onClick={handleCreateCourse} style={buttonStyle as any}>
                        ✓ Создать курс
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
            {/* Progress Bar */}
            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                    {[1, 2, 3, 4].map(step => (
                        <div key={step} style={{
                            height: '4px',
                            flex: 1,
                            borderRadius: '2px',
                            background: activeStep >= step ? 'linear-gradient(90deg, #059669, #047857)' : '#e5e7eb',
                            transition: 'all 0.3s ease'
                        }} />
                    ))}
                </div>
                <p style={{ margin: 0, color: '#6b7280', fontSize: '13px', fontWeight: 600 }}>Шаг {activeStep} из 4</p>
            </div>

            {/* Course Header */}
            <div style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: 'white',
                padding: '24px',
                borderRadius: '12px',
                marginBottom: '24px'
            }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '26px', fontWeight: 700 }}>{courseData.title}</h2>
                <p style={{ margin: 0, opacity: 0.9, fontSize: '14px' }}>Курс #{createdCourseId} • {modules.length} раздел(ов) • {lessons.length} урок(ов)</p>
            </div>

            {/* Step 2: Add Modules */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: activeStep >= 2 ? '#059669' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeStep >= 2 ? 'white' : '#9ca3af',
                        fontWeight: 700,
                        marginRight: '12px'
                    }}>2</div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Добавить разделы</h3>
                </div>
                <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '16px' }}>Разделитесь урок на логические модули/разделы для лучшей организации</p>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Название раздела (например: Основы JavaScript)"
                        value={moduleData.title}
                        onChange={e => setModuleData({ ...moduleData, title: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>
                <button onClick={handleCreateModule} style={buttonStyle as any}>+ Добавить раздел</button>

                {modules.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Созданные разделы:</p>
                        {modules.map(m => (
                            <div key={m.id} style={{
                                padding: '10px 12px',
                                background: '#f3f4f6',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '14px',
                                color: '#374151',
                                display: 'flex',
                                alignItems: 'center'
                            }}>
                                <span style={{ marginRight: '8px' }}>📁</span> {m.title}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Step 3: Add Lessons */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: activeStep >= 3 ? '#059669' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeStep >= 3 ? 'white' : '#9ca3af',
                        fontWeight: '700',
                        marginRight: '12px'
                    }}>3</div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Добавить уроки</h3>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Выберите раздел *</label>
                    <select
                        value={lessonData.module_id}
                        onChange={e => setLessonData({ ...lessonData, module_id: Number(e.target.value) })}
                        style={{...inputStyle, cursor: 'pointer'}}
                    >
                        <option value={0}>-- Выберите раздел --</option>
                        {modules.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                    </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Название урока"
                        value={lessonData.title}
                        onChange={e => setLessonData({ ...lessonData, title: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Видео URL (YouTube)</label>
                    <input
                        type="text"
                        placeholder="https://youtube.com/watch?v=dQw4w9WgXcQ или https://youtu.be/dQw4w9WgXcQ"
                        value={lessonData.url}
                        onChange={e => setLessonData({ ...lessonData, url: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                    <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                        ✓ Поддерживаются форматы: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
                    </p>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <textarea
                        placeholder="Описание урока"
                        value={lessonData.description}
                        onChange={e => setLessonData({ ...lessonData, description: e.target.value })}
                        style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>

                <button onClick={handleAddLessonToModule} style={buttonStyle as any}>+ Добавить урок</button>

                {lessons.length > 0 && (
                    <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                        <p style={{ margin: '0 0 12px 0', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>Добавленные уроки:</p>
                        {lessons.map(l => (
                            <div key={l.id} style={{
                                padding: '10px 12px',
                                background: '#f3f4f6',
                                borderRadius: '6px',
                                marginBottom: '8px',
                                fontSize: '13px',
                                color: '#374151'
                            }}>
                                📺 {l.title} <span style={{ color: '#9ca3af' }}>({l.module_title})</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Step 4: Add Assignments */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: activeStep >= 4 ? '#059669' : '#e5e7eb',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: activeStep >= 4 ? 'white' : '#9ca3af',
                        fontWeight: '700',
                        marginRight: '12px'
                    }}>4</div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#111827' }}>Добавить задания</h3>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Выберите урок *</label>
                    <select
                        value={assignmentData.lesson_id}
                        onChange={e => setAssignmentData({ ...assignmentData, lesson_id: Number(e.target.value) })}
                        style={{...inputStyle, cursor: 'pointer'}}
                    >
                        <option value={0}>-- Выберите урок --</option>
                        {lessons.map((lesson:any) => (
                            <option key={lesson.id} value={lesson.id}>{`${lesson.title}`}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <input
                        type="text"
                        placeholder="Название задания"
                        value={assignmentData.title}
                        onChange={e => setAssignmentData({ ...assignmentData, title: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <textarea
                        placeholder="Текст задания"
                        value={assignmentData.description}
                        onChange={e => setAssignmentData({ ...assignmentData, description: e.target.value })}
                        style={{...inputStyle, minHeight: '80px', resize: 'vertical'}}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>

                <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>Тип задания</label>
                    <select
                        value={assignmentData.task_type}
                        onChange={e => setAssignmentData({ ...assignmentData, task_type: e.target.value })}
                        style={{...inputStyle, cursor: 'pointer'}}
                    >
                        <option value="text">Текст</option>
                        <option value="video">Видео</option>
                    </select>
                </div>

                <div style={{ marginBottom: '24px' }}>
                    <input
                        type="text"
                        placeholder="Ресурс (URL для видео)"
                        value={assignmentData.resource_url}
                        onChange={e => setAssignmentData({ ...assignmentData, resource_url: e.target.value })}
                        style={inputStyle}
                        onFocus={(e) => e.target.style.borderColor = '#059669'}
                        onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                    />
                </div>

                <button onClick={handleAddAssignment} style={buttonStyle as any}>+ Добавить задание</button>
            </div>

            {/* Complete Button */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button
                    onClick={() => setCreatedCourseId(null)}
                    style={{...buttonStyle, background: '#e5e7eb', color: '#374151'} as any}
                >
                    ← Создать новый курс
                </button>
            </div>
        </div>
    );
};

export default AdminCreateCourse;