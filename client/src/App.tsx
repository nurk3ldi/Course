import { useState, useEffect, type FormEvent } from 'react'
import { loginUser, registerUser, getMyCourses } from './api'
import PasswordReset from './PasswordReset'
import { ScrollReveal } from './components/ScrollReveal'
import AdminCreateCourse from './components/AdminCreateCourse' // Импортируем
import CourseViewer from './components/CourseViewer'         // Импортируем
import AuthModal from './components/AuthModal';
import './App.css'

function App() {
  const [page, setPage] = useState('home')
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null) // Для просмотра конкретного курса
  const [currentUser, setCurrentUser] = useState<{id:number;role:string;role_id:number;name:string} | null>(null);
  const [courses, setCourses] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ activeCourses: 0, progress: 0, submittedTasks: 0, notifications: 0 });
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [demoRole, setDemoRole] = useState<'student' | 'admin' | 'employee' | 'client'>('student')
  const [isLoginOpen, setIsLoginOpen] = useState(false); // Состояние для модалки

  const isLogin = page === 'login'


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    try {
      if (isLogin) {
        const data = await loginUser(email, password)
        localStorage.setItem('token', data.token)
        localStorage.setItem('role', data.user.role)
        localStorage.setItem('role_id', data.user.role_id.toString())
        localStorage.setItem('name', data.user.name)
        localStorage.setItem('user_id', data.user.id.toString())
        setCurrentUser(data.user)
        alert('Вы успешно вошли в систему!')

        // Если зашел админ, переходим в админскую панель
        if (data.user.role === 'admin') {
          setPage('admin-create')
        } else {
          setPage('student-courses')
        }
      } else {
        if (password !== confirmPassword) {
          alert('Пароли не совпадают!')
          return
        }
        await registerUser(name, email, password)
        alert('Вы успешно зарегистрировались! Теперь войдите в систему.')
        setPage('login')
      }
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      alert(message)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('role_id');
    setCurrentUser(null);
    setCourses([]);
    setSubmissions([]);
    setPage('home');
  };

  const refreshDashboard = (myCourses: any[], mySubmissions: any[]) => {
    const activeCourses = myCourses.length;
    const submittedTasks = mySubmissions.length;
    const progress = activeCourses ? Math.round((submittedTasks / (activeCourses * 3)) * 100) : 0;
    setDashboardStats({ activeCourses, progress: Math.min(progress, 100), submittedTasks, notifications: 3 });
  };

  useEffect(() => {
    const savedName = localStorage.getItem('name');
    const savedRole = localStorage.getItem('role');
    const savedRoleId = Number(localStorage.getItem('role_id')) || 0;
    const savedUserId = Number(localStorage.getItem('user_id')) || 0;
    if (savedName && savedRole) {
      setCurrentUser({ id: savedUserId, name: savedName, role: savedRole, role_id: savedRoleId });
    }
  }, []);

  const Topbar = () => (
    <header className="topbar">
      <div className="topbar-brand">TooOcenka LMS</div>
      <div className="topbar-actions">
        <button className="topbar-btn topbar-btn-ghost" onClick={() => setPage('home')}>На главную</button>
        {currentUser && <button className="topbar-btn topbar-btn-ghost" onClick={() => setPage('profile')}>Профиль</button>}
        {currentUser?.role === 'admin' && <button className="topbar-btn topbar-btn-ghost" onClick={() => setPage('admin-create')}>Админ-панель</button>}
        {!currentUser && <button className="topbar-btn topbar-btn-ghost" onClick={() => setPage('login')}>Вход</button>}
        {!currentUser && <button className="topbar-btn" onClick={() => setPage('register')}>Регистрация</button>}
        {currentUser && <button className="topbar-btn" onClick={handleLogout}>Выйти</button>}
      </div>
    </header>
  );

  useEffect(() => {
    const loadCoursesAndStats = async () => {
      if (page === 'student-courses' || page === 'profile' || page === 'home') {
        try {
          const token = localStorage.getItem('token') || '';
          const courseList = await getMyCourses(token);
          setCourses(courseList);

          const submissionsRes = await fetch('http://localhost:5000/api/assignments/my', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const mySubmissions = submissionsRes.ok ? await submissionsRes.json() : [];
          setSubmissions(mySubmissions);
          refreshDashboard(courseList, mySubmissions);
        } catch (err: unknown) {
          console.error('Не удалось загрузить курсы/статистику', err);
        }
      }
    };
    loadCoursesAndStats();
  }, [page]);

  // Рендеринг страницы сброса пароля
  if (page === 'reset') {
    return <PasswordReset onBackToLogin={() => setPage('login')} />
  }

  // Рендеринг Админ-панели
  if (page === 'admin-create') {
    return (
      <div className="root">
        <Topbar />
        <AdminCreateCourse />
      </div>
    )
  }

  // Рендеринг списка курсов для клиента/студента
  if (page === 'student-courses') {
    return (
      <div className="root">
        <Topbar />
        <div style={{ maxWidth: 1024, margin: '24px auto' }}>
          <h2>Ваши курсы</h2>
          {courses.length === 0 ? (
            <p>Пока нет доступных курсов. Обратитесь к администратору.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {courses.map((course: any) => (
                <div key={course.id} style={{ border: '1px solid #ddd', padding: 16, borderRadius: 8 }}>
                  <h3>{course.title}</h3>
                  <p>{course.description}</p>
                  <button className="btn-primary" onClick={() => { setSelectedCourseId(course.id); setPage('course-view'); }}>
                    Открыть курс
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Рендеринг Просмотра курса
  if (page === 'course-view' && selectedCourseId) {
    return (
      <div className="root">
        <Topbar />
        <CourseViewer courseId={selectedCourseId} />
      </div>
    )
  }

  // Рендеринг профиля
  if (page === 'profile') {
    return (
      <div className="root">
        <Topbar />
        <div className="profile-page">
          <div className="profile-header">
            <div className="profile-avatar">{currentUser?.name.split(' ').map(x => x[0]).join('').toUpperCase()}</div>
            <div>
              <h1>{currentUser?.name || 'Пользователь'}</h1>
              <p>Роль: {currentUser?.role}</p>
              <p style={{ margin: '6px 0 0 0', color: '#6b7280', fontSize: '13px' }}>Всего ответов: {submissions.length}</p>
            </div>
          </div>

          <div className="profile-stats">
            <div className="profile-stat">Активные курсы: {dashboardStats.activeCourses}</div>
            <div className="profile-stat">Прогресс: {dashboardStats.progress}%</div>
            <div className="profile-stat">Заданий сдано: {dashboardStats.submittedTasks}</div>
            <div className="profile-stat">Уведомлений: {dashboardStats.notifications}</div>
          </div>

          <div className="profile-courses">
            <h2>Ваши курсы</h2>
            {courses.length === 0 ? (
              <p>Пока нет курсов. Обратитесь к администратору.</p>
            ) : (
              <div className="course-grid">
                {courses.map(course => (
                  <div key={course.id} className="course-card">
                    <h3>{course.title}</h3>
                    <p>{course.description}</p>
                    <button className="btn-primary" onClick={() => { setSelectedCourseId(course.id); setPage('course-view'); }}>
                      Перейти
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Рендеринг страниц Авторизации/Регистрации
  if (page === 'login' || page === 'register') {
    return (
      <div className="root">
        <Topbar />

        <div className="auth-page">
          <div className="auth-card">
            <div className="auth-label">{isLogin ? 'Вход в систему' : 'Регистрация'}</div>
            <div className="auth-title">{isLogin ? 'Войдите в личный кабинет' : 'Создайте личный кабинет'}</div>
            
            <form className="auth-form" onSubmit={handleSubmit}>
              {!isLogin && (
                <label className="auth-field">
                  <span>Имя и фамилия</span>
                  <input type="text" placeholder="Введите имя" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
              )}
              <label className="auth-field">
                <span>Email</span>
                <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>

              {isLogin && (
                <label className="auth-field">
                  <span>Роль для входа (демо)</span>
                  <select
                    value={demoRole}
                    onChange={(e) => {
                      const role = e.target.value as 'student' | 'admin' | 'employee' | 'client';
                      setDemoRole(role);

                      if (role === 'admin') {
                        setEmail('admin@mail.com');
                        setPassword('admin123');
                      } else if (role === 'student') {
                        setEmail('student@mail.com');
                        setPassword('student123');
                      } else if (role === 'client') {
                        setEmail('client@mail.com');
                        setPassword('client123');
                      } else if (role === 'employee') {
                        setEmail('employee@mail.com');
                        setPassword('employee123');
                      }
                    }}
                    style={{ padding: '12px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', fontFamily: 'inherit' }}
                  >
                    <option value="student">Ученик</option>
                    <option value="client">Клиент</option>
                    <option value="employee">Сотрудник</option>
                    <option value="admin">Администратор</option>
                  </select>
                </label>
              )}

              <label className="auth-field">
                <span>Пароль</span>
                <input type="password" placeholder="Минимум 8 символов" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </label>

              {isLogin && (
                <div style={{ textAlign: 'right', marginTop: '-10px', marginBottom: '15px' }}>
                  <button type="button" onClick={() => setPage('reset')} className="link-btn">Забыли пароль?</button>
                </div>
              )}

              {!isLogin && (
                <label className="auth-field">
                  <span>Подтверждение пароля</span>
                  <input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </label>
              )}

              <button className="auth-submit" type="submit">{isLogin ? 'Войти' : 'Зарегистрироваться'}</button>
            </form>

            <button className="auth-switch" onClick={() => setPage(isLogin ? 'register' : 'login')}>
              {isLogin ? 'Нет аккаунта? Регистрация' : 'Уже есть аккаунт? Вход'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Главная страница (Home)
  return (
    <div className="root">
      <Topbar />

      {currentUser && (
        <section className="dashboard-overview">
          <div className="dashboard-card">
            <div className="dashboard-card-title">Активные курсы</div>
            <div className="dashboard-card-value">{dashboardStats.activeCourses}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">Прогресс</div>
            <div className="dashboard-card-value">{dashboardStats.progress}%</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">Сдано заданий</div>
            <div className="dashboard-card-value">{dashboardStats.submittedTasks}</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">Уведомления</div>
            <div className="dashboard-card-value">{dashboardStats.notifications}</div>
          </div>
        </section>
      )}

      <div className="hero">
        <div className="hero-main">
          <div className="hero-label">Техническое задание</div>
          <div className="hero-title">
            Платформа
            <br />
            онлайн-<span>курсов</span>
          </div>
          <div className="hero-subtitle">
            RBAC • Видео • Задания • Личные кабинеты
          </div>
          <div className="hero-cta">
            <button className="btn-primary" onClick={() => setPage('register')}>
              Начать обучение
            </button>
            <button className="btn-secondary" onClick={() => setPage('login')}>
              Войти
            </button>
          </div>
          <div className="hero-tags">
            <span>#RBAC</span>
            <span>#Streaming</span>
            <span>#Assignments</span>
            <span>#LMS</span>
          </div>
        </div>
        <div className="hero-right">
          <div className="hero-browser">
            <div className="hero-browser-header">
              <span className="hero-browser-dot" />
              <span className="hero-browser-dot" />
              <span className="hero-browser-dot" />
            </div>
            <div className="hero-browser-content">
              <div className="hero-browser-bar bar-1" />
              <div className="hero-browser-bar bar-2" />
              <div className="hero-browser-bar bar-3" />
              <div className="hero-browser-bar bar-4" />
              <div className="hero-browser-bar bar-5" />
              <div className="hero-browser-block" />
            </div>
          </div>
          <div className="hero-floating-card card-1">
            <div className="hero-floating-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6" /></svg>
            </div>
            <div>
              <div className="hero-floating-title">Курсы и уроки</div>
              <div className="hero-floating-desc">Модули, видео, материалов</div>
            </div>
          </div>
          <div className="hero-floating-card card-2">
            <div className="hero-floating-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <div className="hero-floating-title">Проверка заданий</div>
              <div className="hero-floating-desc">Статусы, комментарии</div>
            </div>
          </div>
          <div className="hero-floating-card card-3">
            <div className="hero-floating-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <div className="hero-floating-title">Личный кабинет</div>
              <div className="hero-floating-desc">Прогресс, уведомления</div>
            </div>
          </div>
        </div>
      </div>

      <ScrollReveal className="hero-features">
        <div className="hero-feature-card">
          <div className="card-title">20 разделов ТЗ</div>
          <div className="card-desc">Полное описание функционала платформы</div>
        </div>
        <div className="hero-feature-card">
          <div className="card-title">4 роли пользователей</div>
          <div className="card-desc">Администратор, клиент, ученик, сотрудник</div>
        </div>
        <div className="hero-feature-card">
          <div className="card-title">Веб-формат</div>
          <div className="card-desc">Адаптивный дизайн, личные кабинеты</div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section" id="roles">
        <div className="section-header">
          <div className="section-index">01</div>
          <div className="section-info">
            <div className="section-label">Ролевая модель</div>
            <div className="section-title">Пользователи системы</div>
          </div>
        </div>
        <div className="grid-4">
          <div className="role-card">
            <div className="role-pill pill-admin">Полный доступ</div>
            <div className="role-name">Администратор</div>
            <ul className="role-list">
              <li>Управление курсами и уроками</li>
              <li>Назначение ролей</li>
              <li>Все заказы и платежи</li>
              <li>Проверка заданий</li>
              <li>Отчёты и статистика</li>
              <li>Настройки платформы</li>
            </ul>
          </div>
          <div className="role-card">
            <div className="role-pill pill-client">Покупка</div>
            <div className="role-name">Клиент</div>
            <ul className="role-list">
              <li>Каталог и покупка</li>
              <li>Доступ к курсам</li>
              <li>Просмотр уроков</li>
              <li>Статусы заказов</li>
              <li>Уведомления</li>
            </ul>
          </div>
          <div className="role-card">
            <div className="role-pill pill-student">Обучение</div>
            <div className="role-name">Ученик</div>
            <ul className="role-list">
              <li>Назначенные курсы</li>
              <li>Отправка заданий</li>
              <li>Статус проверки</li>
              <li>Комментарии куратора</li>
              <li>История отправок</li>
            </ul>
          </div>
          <div className="role-card">
            <div className="role-pill pill-staff">Куратор</div>
            <div className="role-name">Сотрудник</div>
            <ul className="role-list">
              <li>Закреплённые курсы</li>
              <li>Проверка заданий</li>
              <li>Статусы и комментарии</li>
              <li>Методические файлы</li>
            </ul>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section" id="video">
        <div className="section-header">
          <div className="section-index">02</div>
          <div className="section-info">
            <div className="section-label">Защита контента</div>
            <div className="section-title">Видеоуроки</div>
          </div>
        </div>
        <div className="callout">
          <div className="callout-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div>
            <div className="callout-title">
              Видео воспроизводится только внутри платформы
            </div>
            <div className="callout-body">
              Нет штатной кнопки скачивания, нет прямых ссылок на файлы. Доступ только
              авторизованным пользователям с проверкой роли и факта покупки. Запись
              экрана технически невозможно исключить — задача системы исключить
              официальное скачивание.
            </div>
          </div>
        </div>
        <div className="feature-row">
          <div className="feature-block accent">
            <div className="fb-eyebrow">Технические меры</div>
            <div className="fb-title">Защита файлов</div>
            <div className="fb-body">
              Потоковое воспроизведение, временные токенизированные URL, скрытие
              исходных путей, ограничение доступа к хранилищу, запрет индексации.
            </div>
          </div>
          <div className="feature-block dark">
            <div className="fb-eyebrow">Ограничения</div>
            <div className="fb-title">Что запрещено</div>
            <div className="fb-body">
              Кнопка «Скачать видео», прямые ссылки на видеофайлы, публичный доступ к
              хранилищу, отдача файла без проверки сессии.
            </div>
            <div className="fb-tags">
              <span className="fb-tag">Нет download</span>
              <span className="fb-tag">Нет прямых URL</span>
              <span className="fb-tag">Токен обязателен</span>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section" id="assignments">
        <div className="section-header">
          <div className="section-index">03</div>
          <div className="section-info">
            <div className="section-label">Учебный процесс</div>
            <div className="section-title">Приём и проверка заданий</div>
          </div>
        </div>
        <div className="wide-block">
          <div className="wide-header">
            <div className="wide-num">6</div>
            <div>
              <div className="wide-title">Статусов у каждого задания</div>
              <div className="wide-desc">
                Полный цикл от отправки до принятия или отклонения с возможностью
                доработки
              </div>
            </div>
          </div>
          <div className="wide-body">
            <div className="status-flow">
              <span className="status-node sn-0">Не отправлено</span>
              <span className="status-arrow">→</span>
              <span className="status-node sn-1">Отправлено</span>
              <span className="status-arrow">→</span>
              <span className="status-node sn-2">На проверке</span>
              <span className="status-arrow">→</span>
              <span className="status-node sn-3">Принято</span>
            </div>
            <div className="status-flow status-flow-alt">
              <span className="status-node sn-4">На доработку</span>
              <span className="status-arrow">→</span>
              <span className="status-flow-meta">
                повторная отправка
              </span>
              <span className="status-arrow">→</span>
              <span className="status-node sn-1">Отправлено</span>
              <span className="status-arrow">—</span>
              <span className="status-node sn-5">Отклонено</span>
            </div>
          </div>
        </div>
        <div className="feature-row">
          <div className="feature-block">
            <div className="fb-eyebrow">Форматы ответа</div>
            <div className="fb-title">Что принимает система</div>
            <div className="fb-tags">
              <span className="fb-tag green">Текст</span>
              <span className="fb-tag green">PDF</span>
              <span className="fb-tag green">DOC / DOCX</span>
              <span className="fb-tag green">XLS / XLSX</span>
              <span className="fb-tag green">JPG / PNG</span>
              <span className="fb-tag green">ZIP</span>
              <span className="fb-tag green">Текст + файл</span>
            </div>
          </div>
          <div className="feature-block">
            <div className="fb-eyebrow">Действия проверяющего</div>
            <div className="fb-title">Инструменты куратора</div>
            <div className="fb-body">
              Оставить комментарий, изменить статус, прикрепить ответный файл, вернуть
              на доработку — всё в едином интерфейсе.
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section" id="acceptance">
        <div className="section-header">
          <div className="section-index">04</div>
          <div className="section-info">
            <div className="section-label">Продажи</div>
            <div className="section-title">Каталог и покупка курсов</div>
          </div>
        </div>
        <div className="wide-block">
          <div className="wide-grid">
            <div className="wide-item">
              <div className="wi-label">Карточка курса</div>
              <ul className="wi-list">
                <li>Название и описания</li>
                <li>Обложка, стоимость, автор</li>
                <li>Длительность и уроки</li>
                <li>Программа курса</li>
                <li>Кнопки Купить / Подробнее</li>
              </ul>
            </div>
            <div className="wide-item">
              <div className="wi-label">Поиск и фильтры</div>
              <ul className="wi-list">
                <li>Фильтр по категории</li>
                <li>Фильтр по преподавателю</li>
                <li>Сортировка по цене</li>
                <li>Сортировка по популярности</li>
                <li>Поиск по названию</li>
              </ul>
            </div>
            <div className="wide-item">
              <div className="wi-label">Оформление заказа</div>
              <ul className="wi-list">
                <li>Корзина</li>
                <li>Выбор способа оплаты</li>
                <li>Авто-открытие доступа</li>
                <li>Уведомление об оплате</li>
                <li>Статусы заказа</li>
              </ul>
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section">
        <div className="section-header">
          <div className="section-index">05</div>
          <div className="section-info">
            <div className="section-label">Интерфейс</div>
            <div className="section-title">Личные кабинеты</div>
          </div>
        </div>
        <div className="feature-row">
          <div className="feature-block">
            <div className="fb-eyebrow">Клиент / Ученик</div>
            <div className="fb-title">Кабинет учащегося</div>
            <div className="fb-tags">
              <span className="fb-tag">Мои курсы</span>
              <span className="fb-tag">Покупки</span>
              <span className="fb-tag">Прогресс</span>
              <span className="fb-tag">Задания</span>
              <span className="fb-tag">Уведомления</span>
              <span className="fb-tag">Профиль</span>
              <span className="fb-tag">История</span>
            </div>
          </div>
          <div className="feature-block">
            <div className="fb-eyebrow">Сотрудник</div>
            <div className="fb-title">Кабинет куратора</div>
            <div className="fb-tags">
              <span className="fb-tag">Мои курсы</span>
              <span className="fb-tag">Ученики</span>
              <span className="fb-tag">Входящие задания</span>
              <span className="fb-tag">Фильтры статусов</span>
              <span className="fb-tag">Комментарии</span>
              <span className="fb-tag">Материалы</span>
            </div>
          </div>
        </div>
        <div className="feature-block dark">
          <div className="fb-eyebrow">Администратор</div>
          <div className="fb-title">Административная панель</div>
          <div className="fb-tags">
            <span className="fb-tag">Пользователи</span>
            <span className="fb-tag">Роли</span>
            <span className="fb-tag">Курсы</span>
            <span className="fb-tag">Уроки</span>
            <span className="fb-tag">Задания</span>
            <span className="fb-tag">Файлы</span>
            <span className="fb-tag">Платежи</span>
            <span className="fb-tag">Заказы</span>
            <span className="fb-tag">Уведомления</span>
            <span className="fb-tag">Настройки</span>
            <span className="fb-tag">Отчёты</span>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section">
        <div className="section-header">
          <div className="section-index">06</div>
          <div className="section-info">
            <div className="section-label">Требования</div>
            <div className="section-title">Технические параметры</div>
          </div>
        </div>
        <div className="tech-grid">
          <div className="tech-card">
            <div className="tc-num">4</div>
            <div className="tc-label">Устройства</div>
            <div className="tc-desc">
              Адаптивный дизайн: ПК, планшет, мобильный, большие экраны
            </div>
          </div>
          <div className="tech-card">
            <div className="tc-num">4</div>
            <div className="tc-label">Роли в системе</div>
            <div className="tc-desc">
              Масштабируемая ролевая модель с возможностью расширения
            </div>
          </div>
          <div className="tech-card">
            <div className="tc-num">6</div>
            <div className="tc-label">Статусов заказа</div>
            <div className="tc-desc">
              Новый, ожидает оплаты, оплачен, отменён, завершён + черновик
            </div>
          </div>
          <div className="tech-card">
            <div className="tc-num">TLS</div>
            <div className="tc-label">Безопасность</div>
            <div className="tc-desc">
              Шифрование паролей, журналирование, защита форм, разграничение прав
            </div>
          </div>
          <div className="tech-card">
            <div className="tc-num">JWT</div>
            <div className="tc-label">Видеодоступ</div>
            <div className="tc-desc">
              Временные токенизированные ссылки, потоковая отдача, нет прямых URL
            </div>
          </div>
          <div className="tech-card">
            <div className="tc-num">XLS</div>
            <div className="tc-label">Экспорт</div>
            <div className="tc-desc">
              Отчёты по пользователям, курсам, заданиям в Excel или PDF
            </div>
          </div>
        </div>
      </ScrollReveal>

      <ScrollReveal className="section">
        <div className="section-header">
          <div className="section-index">07</div>
          <div className="section-info">
            <div className="section-label">Финал</div>
            <div className="section-title">Критерии приёмки</div>
          </div>
        </div>
        <div className="accept-list">
          <div className="accept-row">
            <span className="ar-num">01</span>
            <span className="ar-text">
              Роли пользователей работают корректно, права разграничены
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">02</span>
            <span className="ar-text">
              Курсы создаются, редактируются и отображаются в каталоге
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">03</span>
            <span className="ar-text">
              Доступ к урокам открывается автоматически после оплаты
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">04</span>
            <span className="ar-text">
              Видео воспроизводится без возможности штатного скачивания
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">05</span>
            <span className="ar-text">Ученик может отправить задание в нужном формате</span>
          </div>
          <div className="accept-row">
            <span className="ar-num">06</span>
            <span className="ar-text">
              Сотрудник и администратор могут проверить задание с комментарием
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">07</span>
            <span className="ar-text">
              Файлы загружаются и привязываются к курсу, уроку, заданию
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">08</span>
            <span className="ar-text">
              Личные кабинеты работают корректно для всех ролей
            </span>
          </div>
          <div className="accept-row">
            <span className="ar-num">09</span>
            <span className="ar-text">
              Уведомления отправляются внутри платформы и на email
            </span>
          </div>
        </div>
      </ScrollReveal>
      {isLoginOpen && (
        <AuthModal 
          onClose={() => setIsLoginOpen(false)} 
          onLogin={(user) => {
            setCurrentUser(user);
            if (user.role === 'admin') {
              setPage('admin-create');
            } else {
              setPage('student-courses');
            }
            setIsLoginOpen(false);
          }} 
        />
      )}
    </div> // Это самый последний закрывающий тег в return
  );
}
  


export default App