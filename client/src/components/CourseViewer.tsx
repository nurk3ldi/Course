import { useEffect, useState } from 'react';
import { getCourseDetail, submitAssignmentAnswer, getMySubmissions } from '../api';

type CourseViewerProps = {
  courseId: number;
};

type AssignmentItem = {
  assignment_id: number;
  assignment_title: string;
  assignment_body: string;
  assignment_type: string;
  assignment_resource: string | null;
};

type LessonItem = {
  lesson_id: number;
  lesson_title: string;
  lesson_desc: string;
  video_url: string;
  assignments: AssignmentItem[];
};

type ModuleItem = {
  module_id: number;
  module_title: string;
  lessons: LessonItem[];
};

// Функция для преобразования YouTube URL в embed формат
function getYouTubeEmbedUrl(url: string): string {
  if (!url) return '';
  
  // Если это уже embed URL
  if (url.includes('youtube.com/embed/') || url.includes('youtu.be/embed/')) {
    return url;
  }
  
  // Если это просто ID видео
  if (url.match(/^[a-zA-Z0-9_-]{11}$/)) {
    return `https://www.youtube.com/embed/${url}`;
  }
  
  try {
    // Проверяем разные форматы YouTube URL
    let videoId = '';
    
    // Формат: https://www.youtube.com/watch?v=ID
    if (url.includes('youtube.com/watch')) {
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }
    // Формат: https://youtu.be/ID
    else if (url.includes('youtu.be/')) {
      const match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (match) videoId = match[1];
    }
    // Формат: https://www.youtube.com/embed/ID
    else if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
    
    // Если формат не распознан, возвращаем оригинальный URL
    return url;
  } catch (error) {
    console.error('Ошибка преобразования YouTube URL:', error);
    return url;
  }
}

const CourseViewer = ({ courseId }: CourseViewerProps) => {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [activeLesson, setActiveLesson] = useState<LessonItem | null>(null);
  const [completedLessons, setCompletedLessons] = useState<Set<number>>(new Set());
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [answerText, setAnswerText] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const refreshSubmissions = async () => {
    try {
      const token = localStorage.getItem('token') || '';
      const mySub = await getMySubmissions(token);
      setSubmissions(mySub);
    } catch (err) {
      console.error('Не удалось загрузить ответы студента', err);
    }
  };

  useEffect(() => {
    const loadCourse = async () => {
      const token = localStorage.getItem('token') || '';
      const rows = await getCourseDetail(courseId, token);

      const modulesMap = new Map<number, ModuleItem>();

      rows.forEach((row: any) => {
        if (!modulesMap.has(row.module_id)) {
          modulesMap.set(row.module_id, {
            module_id: row.module_id,
            module_title: row.module_title,
            lessons: []
          });
        }

        const module = modulesMap.get(row.module_id);
        if (row.lesson_id) {
          let lesson = module!.lessons.find(l => l.lesson_id === row.lesson_id);
          if (!lesson) {
            lesson = {
              lesson_id: row.lesson_id,
              lesson_title: row.lesson_title,
              lesson_desc: row.lesson_desc,
              video_url: row.video_url,
              assignments: []
            };
            module!.lessons.push(lesson);
          }

          if (row.assignment_id) {
            lesson.assignments.push({
              assignment_id: row.assignment_id,
              assignment_title: row.assignment_title,
              assignment_body: row.assignment_body,
              assignment_type: row.assignment_type,
              assignment_resource: row.assignment_resource || ''
            });
          }
        }
      });

      const parsedModules = Array.from(modulesMap.values());
      setModules(parsedModules);
      if (parsedModules.length > 0) {
        setExpandedModules(new Set([parsedModules[0].module_id]));
        const firstLesson = parsedModules[0].lessons[0] || null;
        setActiveLesson(firstLesson);
      }
      await refreshSubmissions();
    };

    loadCourse();
  }, [courseId]);

  const handleSubmitAnswer = async () => {
    if (!selectedAssignmentId || !answerText.trim()) {
      alert('Выберите задание и заполните ответ.');
      return;
    }

    try {
      const token = localStorage.getItem('token') || '';
      await submitAssignmentAnswer(token, selectedAssignmentId, answerText);
      setAnswerText('');
      await refreshSubmissions();
      alert('✓ Ответ отправлен успешно!');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка отправки ответа';
      alert('Ошибка: ' + msg);
    }
  };

  const markLessonComplete = (lessonId: number) => {
    setCompletedLessons(prev => new Set(prev).add(lessonId));
  };

  const goToNextLesson = () => {
    const allLessons = modules.flatMap(m => m.lessons);
    if (!activeLesson) return;
    const currentIndex = allLessons.findIndex(l => l.lesson_id === activeLesson.lesson_id);
    if (currentIndex === -1 || currentIndex === allLessons.length - 1) {
      alert('Это последний урок курса.');
      return;
    }
    const next = allLessons[currentIndex + 1];
    setActiveLesson(next);
  };

  const toggleModule = (moduleId: number) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const sidebarStyle = {
    width: '280px',
    borderRight: '1px solid #e5e7eb',
    padding: '24px 0',
    overflowY: 'auto' as const,
    background: '#f9fafb'
  };

  const moduleHeaderStyle = {
    padding: '12px 16px',
    cursor: 'pointer' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    userSelect: 'none' as const,
    transition: 'all 0.2s ease',
    _hover: {
      background: '#f0f0f0'
    }
  };

  const lessonButtonStyle = (isActive: boolean) => ({
    width: '100%',
    padding: '10px 16px 10px 32px',
    background: isActive ? '#dbeafe' : 'transparent',
    border: 'none',
    cursor: 'pointer' as const,
    textAlign: 'left' as const,
    fontSize: '13px',
    color: isActive ? '#059669' : '#6b7280',
    fontWeight: isActive ? 600 : 500,
    transition: 'all 0.2s ease',
    borderLeft: isActive ? '3px solid #059669' : '3px solid transparent',
    display: 'block'
  });

  const contentStyle = {
    flex: 1,
    padding: '32px',
    overflowY: 'auto' as const,
    maxWidth: '1000px',
    margin: '0 auto',
    width: '100%'
  };

  const assignmentCardStyle = {
    background: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
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
    marginTop: '12px'
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', background: '#ffffff' }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ paddingLeft: '16px', marginBottom: '16px' }}>
          <p style={{ margin: '0', fontSize: '12px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            📚 Структура курса
          </p>
        </div>
        {modules.map((module) => (
          <div key={module.module_id}>
            <div
              style={{...moduleHeaderStyle, background: expandedModules.has(module.module_id) ? '#f0f0f0' : 'transparent'}}
              onClick={() => toggleModule(module.module_id)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{expandedModules.has(module.module_id) ? '▼' : '▶'}</span>
                <span>📁 {module.module_title}</span>
              </span>
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>{module.lessons.length}</span>
            </div>
            {expandedModules.has(module.module_id) && module.lessons.map(lesson => (
              <button
                key={lesson.lesson_id}
                onClick={() => setActiveLesson(lesson)}
                style={lessonButtonStyle(activeLesson?.lesson_id === lesson.lesson_id) as any}
              >
                📺 {lesson.lesson_title}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={contentStyle}>
        {activeLesson ? (
          <>
            {/* Lesson Header */}
            <div style={{ marginBottom: '24px' }}>
              <h1 style={{ margin: '0 0 12px 0', fontSize: '32px', fontWeight: 700, color: '#111827' }}>
                {activeLesson.lesson_title}
              </h1>
              <p style={{ margin: '0 0 12px 0', color: '#6b7280', fontSize: '15px', lineHeight: '1.6' }}>
                {activeLesson.lesson_desc}
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ color: '#047857', fontWeight: 700 }}>
                  Пройдено: {completedLessons.size} / {modules.flatMap(m => m.lessons).length}
                </span>
                <button
                  onClick={() => activeLesson && markLessonComplete(activeLesson.lesson_id)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #059669',
                    background: completedLessons.has(activeLesson.lesson_id) ? '#dcfce7' : '#10b981',
                    color: completedLessons.has(activeLesson.lesson_id) ? '#166534' : 'white',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  {completedLessons.has(activeLesson.lesson_id) ? 'Урок пройден' : 'Отметить как пройденный'}
                </button>

                <button
                  onClick={goToNextLesson}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    border: '1px solid #0ea5e9',
                    background: '#0284c7',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 700
                  }}
                >
                  Следующий урок
                </button>
              </div>
            </div>

            {/* Video Section */}
            {activeLesson.video_url && (
              <div style={{
                background: '#000',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '32px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}>
                <iframe
                  width="100%"
                  height="500"
                  src={getYouTubeEmbedUrl(activeLesson.video_url)}
                  title={activeLesson.lesson_title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{ border: 'none' }}
                  onLoad={() => console.log('✓ Video loaded:', activeLesson.video_url)}
                  onError={() => console.error('✗ Video failed to load:', activeLesson.video_url)}
                />
              </div>
            )}

            {/* Assignments Section */}
            <div>
              <h2 style={{ margin: '0 0 24px 0', fontSize: '24px', fontWeight: 700, color: '#111827' }}>
                📝 Задания
              </h2>
              {activeLesson.assignments.length === 0 ? (
                <div style={{
                  background: '#f0fdf4',
                  border: '1px solid #dcfce7',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center' as const,
                  color: '#166534'
                }}>
                  <p style={{ margin: 0 }}>✓ К этому уроку нет заданий</p>
                </div>
              ) : (
                activeLesson.assignments.map(item => {
                  const currentStudentAnswer = submissions.find((s: any) => s.assignment_id === item.assignment_id);
                  const isAnswered = !!currentStudentAnswer;

                  return (
                    <div key={item.assignment_id} style={assignmentCardStyle}>
                      <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div>
                          <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 700, color: '#111827' }}>
                            {item.assignment_title}
                          </h3>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: '#9ca3af' }}>
                            <span>📌 Тип: {item.assignment_type === 'text' ? 'Текст' : 'Видео'}</span>
                            {isAnswered && <span style={{ color: '#059669', fontWeight: 600 }}>✓ Отправлено</span>}
                          </div>
                        </div>
                      </div>

                      <p style={{ margin: '0 0 16px 0', color: '#6b7280', lineHeight: '1.6' }}>
                        {item.assignment_body}
                      </p>

                      {item.assignment_type === 'video' && item.assignment_resource && (
                        <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #e5e7eb' }}>
                          <a href={item.assignment_resource} target="_blank" rel="noreferrer" style={{
                            color: '#059669',
                            fontWeight: 600,
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            🎬 Открыть видео ресурс
                          </a>
                        </div>
                      )}

                      {/* Answer Input */}
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: '#374151', fontSize: '14px' }}>
                          Ваш ответ:
                        </label>
                        <textarea
                          placeholder="Введите ваш ответ здесь..."
                          value={selectedAssignmentId === item.assignment_id ? answerText : ''}
                          onChange={(e) => {
                            setSelectedAssignmentId(item.assignment_id);
                            setAnswerText(e.target.value);
                          }}
                          rows={5}
                          style={{
                            ...inputStyle,
                            minHeight: '120px',
                            resize: 'vertical'
                          } as any}
                          onFocus={(e) => e.currentTarget.style.borderColor = '#059669'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#d1d5db'}
                        />

                        <button
                          onClick={handleSubmitAnswer}
                          style={buttonStyle as any}
                        >
                          {selectedAssignmentId === item.assignment_id && answerText ? '✓ Отправить ответ' : 'Отправить ответ'}
                        </button>
                      </div>

                      {/* Student's Submission Status */}
                      {currentStudentAnswer && (
                        <div style={{
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div style={{
                            background: '#f0fdf4',
                            border: '1px solid #dcfce7',
                            borderRadius: '8px',
                            padding: '16px'
                          }}>
                            <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#166534' }}>✓ Статус: Отправлено</p>
                            {currentStudentAnswer.teacher_comment && (
                              <div style={{
                                marginTop: '12px',
                                paddingTop: '12px',
                                borderTop: '1px solid #dcfce7'
                              }}>
                                <p style={{ margin: '0 0 6px 0', fontWeight: 600, color: '#6b7280', fontSize: '13px' }}>Комментарий преподавателя:</p>
                                <p style={{ margin: 0, color: '#374151', fontSize: '14px', fontStyle: 'italic' }}>
                                  {currentStudentAnswer.teacher_comment}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '400px',
            color: '#9ca3af',
            fontSize: '16px'
          }}>
            Выберите урок из меню слева
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseViewer;