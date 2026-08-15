import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { makeId } from '../lib/defaults.js';
import { emptyDay, getDay, tasksFromTemplates } from '../lib/day.js';
import { monthId, todayKey, weekId } from '../lib/jalali.js';
import { loadData, saveData } from '../lib/storage.js';
import { emptyAttendance } from '../lib/time.js';
import type {
  Attendance,
  DayRecord,
  Employee,
  FinanceEntry,
  Habit,
  PlannerData,
  Settings,
  Task,
  TaskCategory,
  TaskTemplate,
} from '../lib/types.js';

interface PlannerContextValue {
  data: PlannerData;
  selected: string;
  today: string;
  setSelected: (key: string) => void;
  replaceData: (data: PlannerData) => void;

  updateDay: (key: string, patch: Partial<DayRecord>) => void;
  toggleTask: (key: string, taskId: string) => void;
  addTask: (key: string, title: string, category: TaskCategory) => void;
  removeTask: (key: string, taskId: string) => void;
  resetDayFromTemplates: (key: string) => void;

  toggleHabit: (key: string, habit: Habit) => void;
  saveHabit: (habit: Habit) => void;
  removeHabit: (habitId: string) => void;

  saveTemplate: (template: TaskTemplate) => void;
  removeTemplate: (templateId: string) => void;

  setMonthNote: (monthId: string, text: string) => void;

  assignTask: (key: string, taskId: string, employeeId: string) => void;
  saveEmployee: (employee: Employee) => void;
  removeEmployee: (employeeId: string) => void;
  setAttendance: (key: string, employeeId: string, patch: Partial<Attendance>) => void;

  addEntry: (entry: Omit<FinanceEntry, 'id'>) => void;
  removeEntry: (entryId: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
}

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<PlannerData>(() => loadData());
  const [today, setToday] = useState(() => todayKey());
  const [selected, setSelected] = useState(today);

  useEffect(() => {
    saveData(data);
  }, [data]);

  // اگر اپ از نیمه‌شب رد شد، «امروز» باید خودش جلو برود
  useEffect(() => {
    const timer = window.setInterval(() => {
      const now = todayKey();
      setToday((prev) => (prev === now ? prev : now));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  /** روز را در صورت نیاز از روی قالب‌ها می‌سازد و سپس تغییر را اعمال می‌کند */
  const editDay = useCallback(
    (key: string, edit: (day: DayRecord) => DayRecord) => {
      setData((prev) => {
        const current = prev.days[key] ?? {
          ...emptyDay(),
          tasks: tasksFromTemplates(prev, key),
        };
        return { ...prev, days: { ...prev.days, [key]: edit(current) } };
      });
    },
    [],
  );

  const updateDay = useCallback(
    (key: string, patch: Partial<DayRecord>) => editDay(key, (day) => ({ ...day, ...patch })),
    [editDay],
  );

  const toggleTask = useCallback(
    (key: string, taskId: string) =>
      editDay(key, (day) => ({
        ...day,
        tasks: day.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)),
      })),
    [editDay],
  );

  const addTask = useCallback(
    (key: string, title: string, category: TaskCategory) => {
      const clean = title.trim();
      if (!clean) return;
      const task: Task = {
        id: makeId('task'),
        title: clean,
        category,
        priority: 'normal',
        done: false,
      };
      editDay(key, (day) => ({ ...day, tasks: [...day.tasks, task] }));
    },
    [editDay],
  );

  const removeTask = useCallback(
    (key: string, taskId: string) =>
      editDay(key, (day) => ({ ...day, tasks: day.tasks.filter((t) => t.id !== taskId) })),
    [editDay],
  );

  const resetDayFromTemplates = useCallback((key: string) => {
    setData((prev) => ({
      ...prev,
      days: {
        ...prev.days,
        [key]: { ...getDay(prev, key), tasks: tasksFromTemplates(prev, key) },
      },
    }));
  }, []);

  const toggleHabit = useCallback((key: string, habit: Habit) => {
    setData((prev) => {
      if (habit.freq === 'daily') {
        const day = { ...(prev.dailyLog[key] ?? {}) };
        if (day[habit.id]) delete day[habit.id];
        else day[habit.id] = true;
        return { ...prev, dailyLog: { ...prev.dailyLog, [key]: day } };
      }
      if (habit.freq === 'weekly') {
        const id = weekId(key);
        const week = { ...(prev.weeklyLog[id] ?? {}) };
        if (week[habit.id]) delete week[habit.id];
        else week[habit.id] = true;
        return { ...prev, weeklyLog: { ...prev.weeklyLog, [id]: week } };
      }
      const id = monthId(key);
      const month = { ...(prev.monthlyLog[id] ?? {}) };
      if (month[habit.id]) delete month[habit.id];
      else month[habit.id] = true;
      return { ...prev, monthlyLog: { ...prev.monthlyLog, [id]: month } };
    });
  }, []);

  const saveHabit = useCallback((habit: Habit) => {
    setData((prev) => {
      const exists = prev.habits.some((h) => h.id === habit.id);
      return {
        ...prev,
        habits: exists
          ? prev.habits.map((h) => (h.id === habit.id ? habit : h))
          : [...prev.habits, habit],
      };
    });
  }, []);

  const removeHabit = useCallback((habitId: string) => {
    setData((prev) => ({ ...prev, habits: prev.habits.filter((h) => h.id !== habitId) }));
  }, []);

  const saveTemplate = useCallback((template: TaskTemplate) => {
    setData((prev) => {
      const exists = prev.templates.some((t) => t.id === template.id);
      return {
        ...prev,
        templates: exists
          ? prev.templates.map((t) => (t.id === template.id ? template : t))
          : [...prev.templates, template],
      };
    });
  }, []);

  const removeTemplate = useCallback((templateId: string) => {
    setData((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== templateId),
    }));
  }, []);

  const setMonthNote = useCallback((id: string, text: string) => {
    setData((prev) => ({ ...prev, monthNotes: { ...prev.monthNotes, [id]: text } }));
  }, []);

  const assignTask = useCallback(
    (key: string, taskId: string, employeeId: string) =>
      editDay(key, (day) => ({
        ...day,
        tasks: day.tasks.map((t) =>
          t.id === taskId ? { ...t, assignee: employeeId || undefined } : t,
        ),
      })),
    [editDay],
  );

  const saveEmployee = useCallback((employee: Employee) => {
    setData((prev) => {
      const exists = prev.employees.some((e) => e.id === employee.id);
      return {
        ...prev,
        employees: exists
          ? prev.employees.map((e) => (e.id === employee.id ? employee : e))
          : [...prev.employees, employee],
      };
    });
  }, []);

  /** حذف کارمند، همراه با برداشتن نامش از کارهایی که به او سپرده شده بود */
  const removeEmployee = useCallback((employeeId: string) => {
    setData((prev) => {
      const days: Record<string, DayRecord> = {};
      for (const [key, day] of Object.entries(prev.days)) {
        days[key] = {
          ...day,
          tasks: day.tasks.map((t) =>
            t.assignee === employeeId ? { ...t, assignee: undefined } : t,
          ),
        };
      }
      const attendance: PlannerData['attendance'] = {};
      for (const [key, byEmployee] of Object.entries(prev.attendance)) {
        const { [employeeId]: _removed, ...rest } = byEmployee;
        attendance[key] = rest;
      }
      return {
        ...prev,
        days,
        attendance,
        employees: prev.employees.filter((e) => e.id !== employeeId),
      };
    });
  }, []);

  const setAttendance = useCallback(
    (key: string, employeeId: string, patch: Partial<Attendance>) => {
      setData((prev) => {
        const day = prev.attendance[key] ?? {};
        const current = day[employeeId] ?? emptyAttendance();
        return {
          ...prev,
          attendance: {
            ...prev.attendance,
            [key]: { ...day, [employeeId]: { ...current, ...patch } },
          },
        };
      });
    },
    [],
  );

  const addEntry = useCallback((entry: Omit<FinanceEntry, 'id'>) => {
    setData((prev) => ({
      ...prev,
      finance: [...prev.finance, { ...entry, id: makeId('fin') }],
    }));
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setData((prev) => ({ ...prev, finance: prev.finance.filter((e) => e.id !== entryId) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const replaceData = useCallback((next: PlannerData) => setData(next), []);

  const value = useMemo<PlannerContextValue>(
    () => ({
      data,
      selected,
      today,
      setSelected,
      replaceData,
      updateDay,
      toggleTask,
      addTask,
      removeTask,
      resetDayFromTemplates,
      toggleHabit,
      saveHabit,
      removeHabit,
      saveTemplate,
      removeTemplate,
      setMonthNote,
      assignTask,
      saveEmployee,
      removeEmployee,
      setAttendance,
      addEntry,
      removeEntry,
      updateSettings,
    }),
    [
      data,
      selected,
      today,
      replaceData,
      updateDay,
      toggleTask,
      addTask,
      removeTask,
      resetDayFromTemplates,
      toggleHabit,
      saveHabit,
      removeHabit,
      saveTemplate,
      removeTemplate,
      setMonthNote,
      assignTask,
      saveEmployee,
      removeEmployee,
      setAttendance,
      addEntry,
      removeEntry,
      updateSettings,
    ],
  );

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner(): PlannerContextValue {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error('usePlanner باید داخل PlannerProvider استفاده شود');
  return ctx;
}
