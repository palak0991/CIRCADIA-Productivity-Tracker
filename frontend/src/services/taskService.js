import api from './api';

export const getTasksForDate = async (dateStr, timezone = 'UTC') => {
  const response = await api.get('/tasks', {
    params: { date: dateStr, timezone }
  });
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await api.post('/tasks', taskData);
  return response.data;
};

export const updateTask = async (id, taskData) => {
  const response = await api.put(`/tasks/${id}`, taskData);
  return response.data;
};

export const updateTaskStatus = async (id, statusData) => {
  const response = await api.patch(`/tasks/${id}/status`, statusData);
  return response.data;
};

export const updateActualTime = async (id, action, customTimestamp = null) => {
  const response = await api.patch(`/tasks/${id}/actual-time`, {
    action,
    customTimestamp
  });
  return response.data;
};

export const deleteTask = async (id) => {
  await api.delete(`/tasks/${id}`);
};
