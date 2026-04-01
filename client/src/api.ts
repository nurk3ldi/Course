const API_URL = 'http://localhost:5000/api';

type UserInfo = { id: number; name: string; email: string; role: string; role_id: number };
type AuthResponse = { token: string; user: UserInfo };

export const loginUser = async (email: string, password: string): Promise<AuthResponse> => {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Қате шықты');
  }

  return response.json();
};

export const registerUser = async (name: string, email: string, password: string): Promise<UserInfo> => {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Қате шықты');
  }

  return response.json();
};


export const forgotPasswordUser = async (email: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Қате шықты');
    }
    return response.json();
};

export const resetPasswordUser = async (email: string, code: string, newPassword: string): Promise<{ message: string }> => {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, newPassword }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Қате шықты');
    }
    return response.json();
};

export const getMyCourses = async (token: string) => {
    const response = await fetch(`${API_URL}/courses/my`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось получить курсы');
    }

    return response.json();
};

export const getCourseDetail = async (courseId: number, token: string) => {
    const response = await fetch(`${API_URL}/courses/${courseId}/full`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось получить данные курса');
    }

    return response.json();
};

export const submitAssignmentAnswer = async (token: string, assignmentId: number, text_answer: string) => {
    const response = await fetch(`${API_URL}/assignments/submit`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ assignment_id: assignmentId, text_answer })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Не удалось отправить ответ');
    }

    return response.json();
};

export const getMySubmissions = async (token: string) => {
    const response = await fetch(`${API_URL}/assignments/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Не удалось получить ваши ответы');
    }
    return response.json();
};
