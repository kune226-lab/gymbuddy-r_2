import React, { useState, useMemo, useEffect } from 'react';
// IMPORT KLIENTA SUPABASE (Upewnij się, że plik supabaseClient.js istnieje w tym samym folderze)
import { supabase } from './supabaseClient'; 

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Calendar,
  Activity,
  Weight,
  Dumbbell,
  History,
  Plus,
  Save,
  Filter,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Target,
  Trophy,
  Trash2,
  ArrowUp,
  ArrowDown,
  Minus,
  Clock,
  MapPin,
  BarChart2,
  CheckCircle2,
  AlertCircle,
  X,
  List,
  Copy,
  Flame,
  CalendarDays,
  HeartPulse,
  ChevronDown,
  ArrowRight,
  Moon,
  Sun,
  Layers,
  User,
  LogOut
} from 'lucide-react';

/* --- KONFIGURACJA TAILWIND Z DARK MODE --- */
if (typeof document !== 'undefined') {
  if (!document.querySelector('script[src*="tailwindcss"]')) {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    script.async = false;
    document.head.appendChild(script);
    
    const configScript = document.createElement('script');
    configScript.innerHTML = `
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              gray: {
                750: '#2d3748',
                850: '#1a202c',
                950: '#171923',
              }
            }
          }
        }
      }
    `;
    document.head.appendChild(configScript);
  }
  
  const fontFix = document.createElement('style');
  fontFix.innerHTML = `
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important; }
    input { border: 1px solid #e5e7eb; }
    .dark input { border-color: #374151; background-color: #1f2937; color: white; }
    input[type=number]::-webkit-inner-spin-button, 
    input[type=number]::-webkit-outer-spin-button { 
      -webkit-appearance: none; 
      margin: 0; 
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
        opacity: 0;
        display: block;
        width: 100%;
        height: 100%;
        cursor: pointer;
    }
  `;
  document.head.appendChild(fontFix);
}

// --- HELPERY DANYCH ---

// 1. Zwykły LocalStorage (dla ustawień lokalnych jak motyw)
const useStickyState = (defaultValue, key) => {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
};

// 2. NOWY HOOK: CloudStorage (Supabase + LocalStorage)
const useCloudState = (defaultValue, key) => {
  const [value, setValue] = useState(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  });

  // Efekt POBIERANIA danych z chmury
  useEffect(() => {
    let mounted = true;
    const fetchFromCloud = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data, error } = await supabase
          .from('user_data')
          .select('value')
          .eq('key', key)
          .single();

        if (data && mounted) {
          setValue(data.value);
          window.localStorage.setItem(key, JSON.stringify(data.value));
        }
      }
    };
    fetchFromCloud();
    return () => { mounted = false; };
  }, [key]);

  // Efekt ZAPISYWANIA danych
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));

    const saveToCloud = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        await supabase
          .from('user_data')
          .upsert({ 
            user_id: session.user.id, 
            key: key, 
            value: value 
          }, { onConflict: 'user_id, key' });
      }
    };

    const timer = setTimeout(saveToCloud, 2000);
    return () => clearTimeout(timer);
  }, [key, value]);

  return [value, setValue];
};

const getTotalReps = (val) => {
  if (!val) return 0;
  if (Array.isArray(val)) {
    return val.reduce((acc, curr) => {
      if (typeof curr === 'object' && curr !== null) {
        return acc + (Number(curr.r) || 0);
      }
      return acc + (Number(curr) || 0);
    }, 0);
  }
  if (typeof val === 'object' && val.sets) {
    return Number(val.sets || 0) * Number(val.reps || 0);
  }
  return Number(val);
};

const formatHistoryString = (val) => {
  if (!val) return '';
  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (typeof item === 'object' && item !== null) {
          return item.w ? `${item.w}kg×${item.r}` : `${item.r}`;
        }
        return item;
      })
      .join(', ');
  }
  if (typeof val === 'object' && val.sets) {
    return `${val.sets} serie × ${val.reps}`;
  }
  return val;
};

const getGoalTotal = (goalVal) => {
  if (!goalVal) return 0;
  if (typeof goalVal === 'object') {
    return Number(goalVal.sets || 0) * Number(goalVal.reps || 0);
  }
  return Number(goalVal);
};

const formatDatePL = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

// --- KOMPONENT: Auth Modal (Email + Hasło + Login) ---
const AuthModal = ({ isOpen, onClose }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Reset pól
  useEffect(() => {
    setMessage({ text: '', type: '' });
  }, [isOpen, isLoginMode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (isLoginMode) {
        // Logowanie
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onClose();
        window.location.reload(); 
      } else {
        // Rejestracja
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username: username },
          },
        });
        if (error) throw error;
        setMessage({ 
          text: 'Rejestracja udana! Sprawdź email, aby potwierdzić konto.', 
          type: 'success' 
        });
      }
    } catch (error) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-sm shadow-xl border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in duration-200">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          <X size={20} />
        </button>
        
        <h2 className="text-xl font-bold mb-1 dark:text-white flex items-center gap-2">
          <User className="text-blue-500" /> 
          {isLoginMode ? 'Witaj ponownie!' : 'Utwórz konto'}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {isLoginMode 
            ? 'Zaloguj się, aby zsynchronizować treningi.' 
            : 'Dołącz do GymBuddy i śledź postępy w chmurze.'}
        </p>
        
        {message.text && (
          <div className={`p-3 rounded mb-4 text-sm font-medium ${
            message.type === 'error' 
              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' 
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1">Login</label>
              <Input 
                type="text" 
                placeholder="Np. Arnold" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                required={!isLoginMode}
                className="bg-gray-50 dark:bg-gray-900"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email</label>
            <Input 
              type="email" 
              placeholder="twoj@email.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase ml-1">Hasło</label>
            <Input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              minLength={6}
              className="bg-gray-50 dark:bg-gray-900"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2" 
            disabled={loading}
          >
            {loading 
              ? 'Przetwarzanie...' 
              : (isLoginMode ? 'Zaloguj się' : 'Zarejestruj się')
            }
          </Button>
        </form>

        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isLoginMode ? 'Nie masz jeszcze konta?' : 'Masz już konto?'}
          </p>
          <button 
            onClick={() => setIsLoginMode(!isLoginMode)}
            className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 mt-1"
          >
            {isLoginMode ? 'Zarejestruj się za darmo' : 'Przejdź do logowania'}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- KOMPONENT: Custom Date Picker ---
const CustomDatePicker = ({
  value,
  onChange,
  label = 'Wybierz datę',
  className = '',
}) => {
  return (
    <div className={`relative group min-w-[150px] ${className}`}>
      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 shadow-sm group-hover:border-blue-400 group-hover:ring-2 group-hover:ring-blue-50 dark:group-hover:ring-blue-900 transition-all cursor-pointer h-full">
        <div className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 p-1.5 rounded-lg group-hover:bg-blue-50 dark:group-hover:bg-gray-600 group-hover:text-blue-600 transition-colors">
          <Calendar size={16} />
        </div>
        <div className="flex flex-col flex-1">
          <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight tracking-wider">
            {label}
          </span>
          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm capitalize leading-tight">
            {formatDatePL(value) || '-'}
          </span>
        </div>
        <ChevronDown
          size={14}
          className="text-gray-300 ml-1 group-hover:text-blue-400"
        />
      </div>
      <input
        type="date"
        value={value}
        onChange={onChange}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
      />
    </div>
  );
};

// --- Komponenty UI z Dark Mode ---
const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 transition-colors ${className}`}
  >
    {children}
  </div>
);

const Button = ({
  children,
  onClick,
  variant = 'primary',
  className = '',
  size = 'normal',
  disabled = false,
}) => {
  const base =
    'rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = {
    normal: 'px-4 py-2 text-sm',
    icon: 'p-2',
    sm: 'px-2 py-1 text-xs',
  };
  const styles = {
    primary: 'bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200',
    secondary: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600',
    ghost: 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
    success: 'bg-green-600 text-white hover:bg-green-700',
    danger: 'bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40',
    outline: 'border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size] || sizes.normal} ${
        styles[variant]
      } ${className}`}
    >
      {children}
    </button>
  );
};

const Input = ({ className = '', ...props }) => (
  <input
    className={`w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${className}`}
    {...props}
  />
);

const Label = ({ children }) => (
  <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
    {children}
  </h3>
);

// --- PASEK POSTĘPU ---
const ProgressBar = ({
  current,
  target,
  unit = '',
  label = '',
  colorClass = 'bg-blue-500',
  size = 'normal',
}) => {
  if (!target && target !== 0) return null;
  const valCurrent = Number(current || 0);
  const valTarget = Number(target);

  const isExceeded = valTarget > 0 && valCurrent > valTarget;
  const isDone = valTarget > 0 && valCurrent >= valTarget;
  const percent =
    valTarget > 0 ? Math.min((valCurrent / valTarget) * 100, 100) : 0;

  return (
    <div className="w-full mt-1">
      {(label || unit) && (
        <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 dark:text-gray-400 mb-1">
          <span className="flex items-center gap-1">
            {label}
            {isExceeded && (
              <Flame
                size={12}
                className="text-red-500 fill-red-500 animate-pulse"
              />
            )}
          </span>
          <span
            className={
              isExceeded
                ? 'text-red-500 font-bold'
                : isDone
                ? 'text-green-600 dark:text-green-400 font-bold'
                : 'dark:text-gray-300'
            }
          >
            {valCurrent} / {valTarget} {unit}
          </span>
        </div>
      )}
      <div
        className={`w-full bg-gray-100 dark:bg-gray-700 rounded-full ${
          size === 'sm' ? 'h-1' : 'h-1.5'
        } overflow-hidden`}
      >
        <div
          className={`rounded-full transition-all duration-500 ${
            isExceeded ? 'bg-red-500' : isDone ? 'bg-green-500' : colorClass
          } ${size === 'sm' ? 'h-1' : 'h-1.5'}`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
};

// --- ExerciseSetLogger ---
const ExerciseSetLogger = ({ value, onChange, goal }) => {
  const normalizeData = (input) => {
    if (!Array.isArray(input)) return [];
    return input.map((item) => {
      if (typeof item === 'object' && item !== null)
        return { r: item.r || '', w: item.w || '' };
      return { r: item, w: '' };
    });
  };

  const [sets, setSets] = useState(normalizeData(value));
  const [isEditing, setIsEditing] = useState(sets.length === 0);

  const targetPerSet =
    typeof goal === 'object' && goal.reps ? Number(goal.reps) : 0;

  useEffect(() => {
    const normalized = normalizeData(value);
    setSets(normalized);
    if (normalized.length === 0 && !value) setIsEditing(true);
    else setIsEditing(false);
  }, [value]);

  const addSet = () => setSets([...sets, { r: '', w: '' }]);
  const removeSet = (index) => setSets(sets.filter((_, i) => i !== index));
  const updateSet = (index, field, val) => {
    const newSets = [...sets];
    newSets[index] = { ...newSets[index], [field]: val };
    setSets(newSets);
  };

  const handleSave = () => {
    const cleanSets = sets
      .filter((s) => s.r !== '' && Number(s.r) > 0)
      .map((s) => ({ r: Number(s.r), w: s.w ? Number(s.w) : null }));
    onChange(cleanSets);
    setIsEditing(false);
  };

  const total = sets.reduce((acc, curr) => acc + (Number(curr.r) || 0), 0);

  if (isEditing) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded-lg border border-gray-200 dark:border-gray-600 mt-2">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="text-[9px] font-bold text-gray-400 uppercase w-4 text-center">#</span>
          <div className="flex-1 flex gap-2">
            <span className="flex-1 text-[9px] font-bold text-gray-400 uppercase text-center">KG</span>
            <span className="flex-1 text-[9px] font-bold text-gray-400 uppercase text-center">Powt.</span>
          </div>
          <span className="w-5"></span>
        </div>
        <div className="space-y-2 mb-3">
          {sets.map((set, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 w-4 text-center">{idx + 1}</span>
              <div className="flex-1 flex gap-2">
                <Input
                  type="number"
                  value={set.w}
                  onChange={(e) => updateSet(idx, 'w', e.target.value)}
                  placeholder="kg"
                  className="h-8 text-center text-sm px-1 flex-1"
                />
                <Input
                  type="number"
                  value={set.r}
                  onChange={(e) => updateSet(idx, 'r', e.target.value)}
                  placeholder="0"
                  className="h-8 text-center font-bold px-1 flex-1"
                  autoFocus={idx === sets.length - 1 && !set.r}
                />
              </div>
              <button onClick={() => removeSet(idx)} className="text-red-300 hover:text-red-500 p-1 w-5 flex justify-center">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button onClick={addSet} variant="secondary" size="sm" className="flex-1 text-xs py-1.5"><Plus size={12} /> Seria</Button>
          <Button onClick={handleSave} variant="success" size="sm" className="flex-1 text-xs py-1.5"><Save size={12} /> Zapisz</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 w-full mt-2 relative group hover:border-blue-300 transition-colors">
      <button onClick={() => setIsEditing(true)} className="absolute top-2 right-2 text-gray-400 hover:text-blue-500 p-1.5 bg-gray-50 dark:bg-gray-700 rounded-md opacity-0 group-hover:opacity-100 transition-all z-10"><Edit2 size={14} /></button>
      {sets.length > 0 ? (
        <div className="space-y-2">
          {sets.map((set, i) => {
            const reps = Number(set.r);
            const isSetExceeded = targetPerSet > 0 && reps > targetPerSet;
            const isSetDone = targetPerSet > 0 && reps >= targetPerSet;
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="text-[9px] font-bold text-gray-400 w-5 uppercase">S{i + 1}</div>
                <div className="flex-1 flex flex-col justify-center">
                  <div className="flex justify-between items-center text-xs mb-0.5">
                    <span className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                      {set.w ? <span className="bg-gray-100 dark:bg-gray-700 px-1.5 rounded text-[10px] text-gray-600 dark:text-gray-300 font-mono border border-gray-200 dark:border-gray-600">{set.w}kg</span> : null}
                      <span className="flex items-center gap-1">{reps}x{isSetExceeded && <Flame size={10} className="text-red-500 fill-red-500" />}</span>
                    </span>
                  </div>
                  {targetPerSet > 0 && (
                    <div className="h-1 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${isSetExceeded ? 'bg-red-500' : isSetDone ? 'bg-green-500' : 'bg-blue-400'}`} style={{ width: `${Math.min((reps / targetPerSet) * 100, 100)}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center mt-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Suma</span>
            <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{total} powt.</span>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-4 text-gray-400 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded transition-colors" onClick={() => setIsEditing(true)}>
          <List size={20} className="mb-1 opacity-20" /><span className="text-[10px] font-medium">Brak serii</span><span className="text-[9px] text-blue-500 mt-0.5">Dodaj wynik</span>
        </div>
      )}
    </div>
  );
};

// --- SMART FIELD ---
const SmartField = ({
  value,
  onChange,
  unit = '',
  placeholder = '0',
  label = '',
}) => {
  const [isEditing, setIsEditing] = useState(!value && value !== 0);
  const [tempVal, setTempVal] = useState(value);

  useEffect(() => {
    setTempVal(value);
    if (value === undefined || value === null || value === '')
      setIsEditing(true);
    else setIsEditing(false);
  }, [value]);

  const handleSave = () => {
    onChange(tempVal);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex gap-2 items-center w-full">
        <div className="flex-1">
          {label && <span className="text-[10px] text-gray-500 uppercase font-bold block mb-1">{label}</span>}
          <Input type="number" placeholder={placeholder} value={tempVal} onChange={(e) => setTempVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSave()} />
        </div>
        <Button onClick={handleSave} variant="success" size="icon" className="mt-auto h-[38px] w-[38px]"><Save size={16} /></Button>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 w-full min-h-[58px]">
      <div className="flex flex-col">
        {label && <span className="text-[10px] text-gray-400 uppercase font-bold">{label}</span>}
        <span className="font-bold text-gray-800 dark:text-gray-200 text-lg">{value || 0} <span className="text-sm font-normal text-gray-500">{unit}</span></span>
      </div>
      <Button onClick={() => setIsEditing(true)} variant="ghost" size="icon"><Edit2 size={16} /></Button>
    </div>
  );
};

// --- HEATMAPA ---
const ActivityHeatmap = ({ logs, goals }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const shiftMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const log = logs[dateStr];
    let intensity = 0;
    let isFire = false;
    let totalRepsToday = 0;
    let totalGoalToday = 0;

    if (log) {
      if (log.exercises) {
        Object.entries(log.exercises).forEach(([name, val]) => {
          const count = getTotalReps(val);
          if (count > 0) {
            intensity += 1;
            totalRepsToday += count;
            const goal = goals.daily[name];
            totalGoalToday += getGoalTotal(goal);
          }
        });
      }
      if (log.cardio && Object.keys(log.cardio).length > 0) intensity += 1;
      if (totalGoalToday > 0 && totalRepsToday > totalGoalToday) isFire = true;
    }
    return { day, dateStr, intensity, isFire };
  });

  const getCellClass = (d) => {
    if (d.isFire) return 'bg-red-500 text-white shadow-red-200 dark:shadow-red-900 shadow-md scale-105 border-red-600';
    if (d.intensity === 0) return 'bg-gray-100 dark:bg-gray-700 text-gray-300 dark:text-gray-600';
    if (d.intensity <= 2) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300';
    if (d.intensity <= 4) return 'bg-green-300 dark:bg-green-700 text-green-800 dark:text-green-100';
    return 'bg-green-500 text-white';
  };

  return (
    <Card className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <CalendarDays size={18} className="text-green-600" /> Aktywność w tym miesiącu
        </h3>
        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700 rounded-lg p-1">
          <button onClick={() => shiftMonth(-1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm text-gray-600 dark:text-gray-300"><ChevronLeft size={16} /></button>
          <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-32 text-center capitalize">{currentDate.toLocaleString('pl-PL', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => shiftMonth(1)} className="p-1 hover:bg-white dark:hover:bg-gray-600 rounded shadow-sm text-gray-600 dark:text-gray-300"><ChevronRight size={16} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'].map((d) => (
          <div key={d} className="text-center text-[10px] text-gray-400 uppercase font-bold">{d}</div>
        ))}
        {days.map((d) => (
          <div key={d.dateStr} className={`aspect-square rounded-md flex flex-col items-center justify-center text-xs font-bold transition-all relative border border-transparent ${getCellClass(d)}`} title={`${d.dateStr}`}>
            {d.day}
            {d.isFire && <Flame size={10} className="absolute -top-1 -right-1 text-yellow-300 fill-yellow-300 animate-pulse drop-shadow-sm" />}
          </div>
        ))}
      </div>
    </Card>
  );
};

// --- Główna Aplikacja ---

export default function WorkoutJournal() {
  const [activeTab, setActiveTab] = useState('day');
  
  // Zmiana 1: Integracja Supabase Cloud State
  const [exercisesList, setExercisesList] = useCloudState(
    ['Pompki', 'Przysiady', 'Plank'],
    'gymbuddy_exercises'
  );
  
  const [exerciseGroups, setExerciseGroups] = useCloudState(
    { Pompki: 'Klatka', Przysiady: 'Nogi', Plank: 'Brzuch' },
    'gymbuddy_exercise_groups'
  );

  const [cardioList, setCardioList] = useCloudState(
    ['Bieganie', 'Rower'],
    'gymbuddy_cardio'
  );
  const [goals, setGoals] = useCloudState(
    {
      daily: {
        Pompki: { sets: 3, reps: 20 },
        Przysiady: { sets: 4, reps: 15 },
        Bieganie_time: 30,
        Bieganie_km: 5,
      },
      weekly: { Pompki: 300, Bieganie_km: 20, Bieganie_time: 120 },
    },
    'gymbuddy_goals'
  );

  const [logs, setLogs] = useCloudState(
    {
      [new Date().toISOString().split('T')[0]]: {
        weight: 75,
        measurements: {},
        cardio: {},
        exercises: {},
      },
    },
    'gymbuddy_logs'
  );

  // Motyw zostaje lokalny
  const [isDarkMode, setIsDarkMode] = useStickyState(false, 'gymbuddy_theme');

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [widgetDate, setWidgetDate] = useState(selectedDate);
  const [summaryMode, setSummaryMode] = useState('week');
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 6))
      .toISOString()
      .split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Zmiana 2: Obsługa sesji i Auth
  const [session, setSession] = useState(null);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload(); 
  };

  useEffect(() => {
    setWidgetDate(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const [newExerciseName, setNewExerciseName] = useState('');
  const [newExerciseGroup, setNewExerciseGroup] = useState('Inne');
  const [newCardioName, setNewCardioName] = useState('');

  const currentLog = logs[selectedDate] || {
    weight: null,
    measurements: {},
    cardio: {},
    exercises: {},
  };
  
  const availableGroups = ['Klatka', 'Plecy', 'Nogi', 'Barki', 'Biceps', 'Triceps', 'Brzuch', 'Inne'];

  const getExerciseGroup = (exName) => exerciseGroups[exName] || 'Inne';

  // --- REKORDY ---
  const personalRecords = useMemo(() => {
    let records = {};
    exercisesList.forEach((ex) => {
      let maxReps = 0;
      let bestDate = '-';
      Object.entries(logs).forEach(([date, log]) => {
        if (log.exercises && log.exercises[ex]) {
          const val = log.exercises[ex];
          let currentMax = 0;
          if (Array.isArray(val)) {
            currentMax = Math.max(
              ...val.map((item) => {
                return typeof item === 'object' ? Number(item.r) : Number(item);
              })
            );
          } else if (typeof val === 'object' && val.reps) {
            currentMax = Number(val.reps);
          } else if (typeof val === 'number') {
            currentMax = val;
          }
          if (currentMax > maxReps) {
            maxReps = currentMax;
            bestDate = date;
          }
        }
      });
      if (maxReps > 0) records[ex] = { maxReps, date: bestDate };
    });
    return records;
  }, [logs, exercisesList]);

  const copyLastWorkout = () => {
    const dates = Object.keys(logs).sort().reverse();
    const lastDate = dates.find(
      (d) => d < selectedDate && Object.keys(logs[d].exercises || {}).length > 0
    );

    if (lastDate) {
      const lastLog = logs[lastDate];
      setLogs((prev) => ({
        ...prev,
        [selectedDate]: {
          ...prev[selectedDate],
          exercises: { ...lastLog.exercises },
          cardio: { ...lastLog.cardio },
        },
      }));
      alert(`Skopiowano trening z dnia ${lastDate}`);
    } else {
      alert('Nie znaleziono poprzedniego treningu do skopiowania.');
    }
  };

  const updateLogData = (path, value) => {
    setLogs((prev) => {
      const dayLog = prev[selectedDate] || {
        cardio: {},
        exercises: {},
        measurements: {},
      };
      const newLog = {
        ...prev,
        [selectedDate]: {
          ...dayLog,
          exercises: { ...dayLog.exercises },
          cardio: { ...dayLog.cardio },
          measurements: { ...dayLog.measurements },
        },
      };

      if (path.type === 'weight') newLog[selectedDate].weight = value;
      else if (path.type === 'measure')
        newLog[selectedDate].measurements = {
          ...(newLog[selectedDate].measurements || {}),
          [path.name]: value,
        };
      else if (path.type === 'ex')
        newLog[selectedDate].exercises[path.name] = value;
      else if (path.type === 'cardio') {
        newLog[selectedDate].cardio[path.name] = {
          ...(newLog[selectedDate].cardio[path.name] || {}),
          [path.field]: value,
        };
      }
      return newLog;
    });
  };

  const removeType = (list, setList, name) =>
    setList(list.filter((item) => item !== name));
    
  const addExerciseToList = () => {
    if (newExerciseName && !exercisesList.includes(newExerciseName)) {
      setExercisesList([...exercisesList, newExerciseName]);
      setExerciseGroups(prev => ({...prev, [newExerciseName]: newExerciseGroup}));
      setNewExerciseName('');
    }
  };

  const addCardioToList = () => {
    if (newCardioName && !cardioList.includes(newCardioName)) {
      setCardioList([...cardioList, newCardioName]);
      setNewCardioName('');
    }
  };

  const calculateWeekStats = (referenceDate) => {
    const d = new Date(referenceDate);
    const day = d.getDay() || 7;
    if (day !== 1) d.setHours(-24 * (day - 1));
    const startWeek = d.toISOString().split('T')[0];
    const e = new Date(d);
    e.setDate(d.getDate() + 6);
    const endWeek = e.toISOString().split('T')[0];

    let stats = {
      exercises: {},
      cardio: {},
      range: { start: startWeek, end: endWeek },
    };

    Object.keys(logs).forEach((date) => {
      if (date >= startWeek && date <= endWeek) {
        const log = logs[date];
        if (log.exercises) {
          Object.entries(log.exercises).forEach(([name, val]) => {
            stats.exercises[name] =
              (stats.exercises[name] || 0) + getTotalReps(val);
          });
        }
        if (log.cardio) {
          Object.entries(log.cardio).forEach(([name, val]) => {
            if (!stats.cardio[name]) stats.cardio[name] = { km: 0, time: 0 };
            stats.cardio[name].km += Number(val.km || 0);
            stats.cardio[name].time += Number(val.time || 0);
          });
        }
      }
    });
    return stats;
  };

  const shiftWidgetWeek = (direction) => {
    const d = new Date(widgetDate);
    d.setDate(d.getDate() + direction * 7);
    setWidgetDate(d.toISOString().split('T')[0]);
  };

  const summaryData = useMemo(() => {
    let totalKcal = 0;
    let totalTime = 0;
    let totalReps = 0;
    let totalKm = 0;
    let exerciseStats = {};

    let startDateStr = selectedDate;
    let endDateStr = selectedDate;

    if (summaryMode === 'week') {
      const d = new Date(selectedDate);
      const day = d.getDay() || 7;
      if (day !== 1) d.setHours(-24 * (day - 1));
      startDateStr = d.toISOString().split('T')[0];
      const e = new Date(d);
      e.setDate(d.getDate() + 6);
      endDateStr = e.toISOString().split('T')[0];
    } else if (summaryMode === 'month') {
      startDateStr = selectedDate.substring(0, 7) + '-01';
      const d = new Date(selectedDate);
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      endDateStr = lastDay.toISOString().split('T')[0];
    }

    const datesInRange = Object.keys(logs)
      .filter((d) => d >= startDateStr && d <= endDateStr)
      .sort();

    datesInRange.forEach((date) => {
      const log = logs[date];
      if (log.cardio) {
        Object.values(log.cardio).forEach((c) => {
          totalKcal += Number(c.kcal || 0);
          totalTime += Number(c.time || 0);
          totalKm += Number(c.km || 0);
        });
      }
      if (log.exercises) {
        Object.entries(log.exercises).forEach(([name, val]) => {
          const count = getTotalReps(val);
          totalReps += count;
          exerciseStats[name] = (exerciseStats[name] || 0) + count;
        });
      }
    });

    let weightDiff = null;
    const weightsInRange = datesInRange
      .map((d) => logs[d]?.weight)
      .filter((w) => w !== undefined && w !== null);
    if (weightsInRange.length >= 2) {
      const startW = parseFloat(weightsInRange[0]);
      const endW = parseFloat(weightsInRange[weightsInRange.length - 1]);
      weightDiff = (endW - startW).toFixed(1);
    }

    return {
      totalKcal,
      totalTime,
      totalReps,
      totalKm,
      exerciseStats,
      weightDiff,
      range: { start: startDateStr, end: endDateStr },
    };
  }, [logs, selectedDate, summaryMode]);

  const chartData = useMemo(() => {
    const dates = [];
    const curr = new Date(dateRange.start);
    const last = new Date(dateRange.end);

    while (curr <= last) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    return dates.map((date) => {
      const log = logs[date] || {};
      let cKm = 0,
        cKcal = 0,
        cTime = 0;
      if (log.cardio) {
        Object.values(log.cardio).forEach((c) => {
          cKm += Number(c.km || 0);
          cKcal += Number(c.kcal || 0);
          cTime += Number(c.time || 0);
        });
      }

      let exData = {};
      if (log.exercises) {
        Object.entries(log.exercises).forEach(([name, val]) => {
          exData[name] = getTotalReps(val);
        });
      }

      return {
        date,
        weight: log.weight,
        ...exData,
        cardioKm: cKm,
        cardioKcal: cKcal,
        cardioTime: cTime,
      };
    });
  }, [logs, dateRange]);

  // --- WIDOKI ---

  const renderSummaryCard = () => (
    <Card className="bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white border-none mb-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10 blur-2xl"></div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 relative z-10">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-400" /> Podsumowanie
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            {summaryData.range.start} — {summaryData.range.end}
          </p>
        </div>
        <div className="flex bg-gray-700/50 p-1 rounded-lg backdrop-blur-sm">
          {['day', 'week', 'month'].map((mode) => (
            <button
              key={mode}
              onClick={() => setSummaryMode(mode)}
              className={`px-3 py-1 rounded text-xs font-medium transition-all capitalize ${
                summaryMode === mode
                  ? 'bg-white text-black shadow'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              {mode === 'day' ? 'Dzień' : mode === 'week' ? 'Tydzień' : 'Miesiąc'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
          <h4 className="text-xs font-bold text-blue-300 uppercase mb-3 flex items-center gap-2">
            <HeartPulse size={14} /> Strefa Cardio
          </h4>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-900/50 p-2 rounded-lg">
              <div className="text-xl font-bold text-white">{summaryData.totalKcal}</div>
              <div className="text-[9px] text-gray-400 uppercase">Kcal</div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded-lg">
              <div className="text-xl font-bold text-blue-400">
                {summaryData.totalTime}<span className="text-xs text-gray-500 ml-0.5">m</span>
              </div>
              <div className="text-[9px] text-gray-400 uppercase">Czas</div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded-lg">
              <div className="text-xl font-bold text-teal-400">
                {summaryData.totalKm}<span className="text-xs text-gray-500 ml-0.5">km</span>
              </div>
              <div className="text-[9px] text-gray-400 uppercase">Dystans</div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
          <h4 className="text-xs font-bold text-purple-300 uppercase mb-3 flex items-center gap-2">
            <Dumbbell size={14} /> Strefa Siłowa
          </h4>
          <div className="grid grid-cols-2 gap-2 text-center">
            <div className="bg-gray-900/50 p-2 rounded-lg">
              <div className="text-xl font-bold text-purple-400">{summaryData.totalReps}</div>
              <div className="text-[9px] text-gray-400 uppercase">Suma Powtórzeń</div>
            </div>
            <div className="bg-gray-900/50 p-2 rounded-lg">
              {summaryData.weightDiff !== null ? (
                <div className={`text-xl font-bold flex items-center justify-center gap-1 ${parseFloat(summaryData.weightDiff) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {parseFloat(summaryData.weightDiff) > 0 ? <ArrowUp size={14} /> : parseFloat(summaryData.weightDiff) < 0 ? <ArrowDown size={14} /> : <Minus size={14} />}
                  {Math.abs(summaryData.weightDiff)} <span className="text-xs text-gray-500">kg</span>
                </div>
              ) : (
                <div className="text-xl font-bold text-gray-500">-</div>
              )}
              <div className="text-[9px] text-gray-400 uppercase">Zmiana wagi</div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  const renderWeeklyGoalsWidget = () => {
    const stats = calculateWeekStats(widgetDate);
    const formatDate = (d) => new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
    const rangeStr = `${formatDate(stats.range.start)} - ${formatDate(stats.range.end)}`;
    const hasAnyWeeklyGoals = exercisesList.some((ex) => goals.weekly[ex]) || cardioList.some((c) => goals.weekly[`${c}_km`] || goals.weekly[`${c}_time`]);

    return (
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 px-1 gap-4">
          <h3 className="text-gray-900 dark:text-gray-100 font-bold flex items-center gap-2 text-lg">
            <BarChart2 className="text-purple-600 dark:text-purple-400" /> Postęp Tygodniowy
          </h3>
          <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-1 shadow-sm">
            <button onClick={() => shiftWidgetWeek(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><ChevronLeft size={18} /></button>
            <div className="flex flex-col px-4 text-center min-w-[140px]">
              <span className="text-[9px] uppercase font-bold text-gray-400 leading-tight tracking-wider">Zakres</span>
              <div className="flex items-center justify-center gap-2">
                <Calendar size={12} className="text-blue-500" />
                <span className="font-bold text-gray-800 dark:text-gray-200 text-sm">{rangeStr}</span>
              </div>
            </div>
            <button onClick={() => shiftWidgetWeek(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        {!hasAnyWeeklyGoals ? (
          <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-100 dark:border-purple-800">
            <div className="flex items-center gap-3 text-purple-800 dark:text-purple-200">
              <AlertCircle />
              <div>
                <h4 className="font-bold">Brak celów tygodniowych</h4>
                <p className="text-sm text-purple-600 dark:text-purple-300">Przejdź do zakładki "Cele", aby ustalić tygodniowe limity i śledzić postęp.</p>
              </div>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Dumbbell size={14} /> Ćwiczenia (Suma)</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {exercisesList.map((ex) => {
                  const current = stats.exercises[ex] || 0;
                  const target = getGoalTotal(goals.weekly[ex]);
                  if (!target) return null;
                  const isExceeded = current > target;
                  const isMet = current >= target;
                  let cardClass = 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600';
                  if (isExceeded) cardClass = 'bg-red-50 dark:bg-red-900/20 border-red-500 shadow-red-100';
                  else if (isMet) cardClass = 'bg-green-50 dark:bg-green-900/20 border-green-500 shadow-green-100';

                  return (
                    <div key={ex} className={`p-3 rounded-lg border flex flex-col justify-between transition-all hover:shadow-md ${cardClass}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300 truncate w-full" title={ex}>{ex}</span>
                        {isExceeded ? <Flame size={14} className="text-red-500 fill-red-500 animate-pulse flex-shrink-0" /> : isMet ? <CheckCircle2 size={14} className="text-green-600 dark:text-green-400 flex-shrink-0" /> : null}
                      </div>
                      <div>
                        <div className="text-xl font-bold text-gray-800 dark:text-gray-100 leading-none mb-1">
                          {current} <span className="text-[10px] text-gray-400 font-normal">/ {target}</span>
                        </div>
                        <div className="mt-2 h-1 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${isExceeded ? 'bg-red-500' : isMet ? 'bg-green-500' : 'bg-purple-500'}`} style={{ width: `${Math.min((current / target) * 100, 100)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-4 flex items-center gap-2"><Activity size={14} /> Cardio</h4>
              <div className="space-y-3">
                {cardioList.map((type) => {
                  const currentKm = stats.cardio[type]?.km || 0;
                  const targetKm = goals.weekly[`${type}_km`];
                  const currentTime = stats.cardio[type]?.time || 0;
                  const targetTime = goals.weekly[`${type}_time`];
                  if (!targetKm && !targetTime) return null;
                  const isKmExceeded = targetKm && currentKm > targetKm;
                  const isTimeExceeded = targetTime && currentTime > targetTime;

                  return (
                    <div key={type} className={`p-3 rounded-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600`}>
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{type}</div>
                        {isKmExceeded || isTimeExceeded ? <Flame size={14} className="text-red-500 fill-red-500 animate-pulse" /> : null}
                      </div>
                      <div className="flex gap-4">
                        {targetKm && (
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                              <span className="flex items-center gap-1"><MapPin size={10} /> Dystans</span>
                              <span className={isKmExceeded ? 'text-red-600 font-bold' : ''}>{currentKm} / {targetKm} km</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full"><div className={`h-1.5 rounded-full ${isKmExceeded ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${Math.min((currentKm / targetKm) * 100, 100)}%` }}></div></div>
                          </div>
                        )}
                        {targetTime && (
                          <div className="flex-1">
                            <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                              <span className="flex items-center gap-1"><Clock size={10} /> Czas</span>
                              <span className={isTimeExceeded ? 'text-red-600 font-bold' : ''}>{currentTime} / {targetTime} min</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 h-1.5 rounded-full"><div className={`h-1.5 rounded-full ${isTimeExceeded ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((currentTime / targetTime) * 100, 100)}%` }}></div></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDayView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      {renderSummaryCard()}
      {renderWeeklyGoalsWidget()}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <Card>
            <Label>
              <Dumbbell size={18} className="text-purple-500" /> Zarządzaj typami
            </Label>
            <div className="mb-4">
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Ćwiczenia i Grupy</span>
              <div className="flex flex-wrap gap-2 mb-2">
                {exercisesList.map((ex) => (
                  <div key={ex} className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs border border-purple-100 dark:border-purple-800">
                    <span className="opacity-50 mr-1 text-[10px] uppercase">
                      {getExerciseGroup(ex).substring(0,3)}
                    </span>
                    {ex}
                    <button onClick={() => removeType(exercisesList, setExercisesList, ex)} className="hover:text-red-500 ml-1"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input placeholder="Nazwa ćwiczenia..." value={newExerciseName} onChange={(e) => setNewExerciseName(e.target.value)} className="mb-2" />
                  <select 
                    value={newExerciseGroup} 
                    onChange={(e) => setNewExerciseGroup(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 focus:outline-none"
                  >
                    {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <Button onClick={addExerciseToList} size="icon" className="h-full"><Plus size={16} /></Button>
              </div>
            </div>
            <div>
              <span className="text-xs font-bold text-gray-500 uppercase block mb-2">Cardio</span>
              <div className="flex flex-wrap gap-2 mb-2">
                {cardioList.map((c) => (
                  <div key={c} className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded text-xs border border-blue-100 dark:border-blue-800">
                    {c}
                    <button onClick={() => removeType(cardioList, setCardioList, c)} className="hover:text-red-500 ml-1"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="Dodaj np. Rower" value={newCardioName} onChange={(e) => setNewCardioName(e.target.value)} />
                <Button onClick={addCardioToList} size="icon"><Plus size={16} /></Button>
              </div>
            </div>
          </Card>

          <Card>
            <Label><Weight size={18} className="text-orange-500" /> Waga i Pomiary</Label>
            <div className="space-y-4">
              <SmartField value={currentLog.weight} onChange={(v) => updateLogData({ type: 'weight' }, v)} unit="kg" label="Masa ciała" />
              <div className="grid grid-cols-2 gap-3">
                <SmartField value={currentLog.measurements?.chest} onChange={(v) => updateLogData({ type: 'measure', name: 'chest' }, v)} unit="cm" label="Klatka" />
                <SmartField value={currentLog.measurements?.waist} onChange={(v) => updateLogData({ type: 'measure', name: 'waist' }, v)} unit="cm" label="Pas" />
                <SmartField value={currentLog.measurements?.bicep} onChange={(v) => updateLogData({ type: 'measure', name: 'bicep' }, v)} unit="cm" label="Biceps" />
                <SmartField value={currentLog.measurements?.thigh} onChange={(v) => updateLogData({ type: 'measure', name: 'thigh' }, v)} unit="cm" label="Udo" />
              </div>
            </div>
          </Card>
        </div>

        <Card>
          <Label><Activity size={18} className="text-blue-500" /> Cardio</Label>
          <div className="space-y-6">
            {cardioList.map((type) => {
              const data = currentLog.cardio?.[type] || {};
              const goalTime = goals.daily[`${type}_time`];
              const goalKm = goals.daily[`${type}_km`];
              return (
                <div key={type} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700 p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold text-gray-800 dark:text-gray-200">{type}</span>
                    <div className="flex gap-1">
                      {goalTime && <span className="text-[10px] text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/40 px-2 py-0.5 rounded">Cel: {goalTime} min</span>}
                      {goalKm && <span className="text-[10px] text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/40 px-2 py-0.5 rounded">Cel: {goalKm} km</span>}
                    </div>
                  </div>
                  <ProgressBar current={data.time || 0} target={goalTime} unit="min" label="Czas" />
                  <ProgressBar current={data.km || 0} target={goalKm} unit="km" label="Dystans" />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <SmartField label="KM" value={data.km} onChange={(v) => updateLogData({ type: 'cardio', name: type, field: 'km' }, v)} />
                    <SmartField label="KCAL" value={data.kcal} onChange={(v) => updateLogData({ type: 'cardio', name: type, field: 'kcal' }, v)} />
                    <SmartField label="MIN" value={data.time} onChange={(v) => updateLogData({ type: 'cardio', name: type, field: 'time' }, v)} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex justify-between items-center mb-4">
          <Label><Dumbbell size={18} className="text-yellow-600" /> Ćwiczenia Siłowe</Label>
          <span className="text-xs text-gray-400 font-normal italic">Pogrupowane wg partii</span>
        </div>
        
        {/* GRUPOWANIE ĆWICZEŃ W WIDOKU */}
        {Object.entries(
          exercisesList.reduce((acc, ex) => {
            const grp = getExerciseGroup(ex);
            if (!acc[grp]) acc[grp] = [];
            acc[grp].push(ex);
            return acc;
          }, {})
        ).map(([groupName, groupExercises]) => (
          <div key={groupName} className="mb-6 last:mb-0">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-1">
              <Layers size={12} /> {groupName}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupExercises.map((ex) => {
                const goalObj = goals.daily[ex];
                const goalTotal = getGoalTotal(goalObj);
                const val = currentLog.exercises?.[ex];
                const currentTotal = getTotalReps(val);

                return (
                  <div key={ex} className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm relative">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-gray-700 dark:text-gray-200 text-sm truncate pr-2">{ex}</span>
                      {goalTotal > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Cel: {typeof goalObj === 'object' ? `${goalObj.sets}x${goalObj.reps}` : goalTotal}
                        </span>
                      )}
                    </div>
                    <ProgressBar current={currentTotal} target={goalTotal} unit="powt." label="Postęp dzienny" colorClass="bg-yellow-500" />
                    <ExerciseSetLogger value={val} goal={goalObj} onChange={(v) => updateLogData({ type: 'ex', name: ex }, v)} />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );

  const renderGoalsView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-6 rounded-xl shadow-lg">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-2"><Target className="text-blue-300" /> Ustalanie Celów</h2>
        <p className="text-blue-100 opacity-90 max-w-2xl">Definiuj swoje limity. Możesz ustawić cel jako ilość serii i powtórzeń (np. 3 serie po 15 powt.).</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Activity size={18} className="text-green-500" /> Cele Dzienne</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Siłowe (Serie x Powt.)</h4>
              <div className="grid grid-cols-1 gap-4">
                {exercisesList.map((ex) => {
                  const g = goals.daily[ex] || {};
                  const s = typeof g === 'object' ? g.sets : '';
                  const r = typeof g === 'object' ? g.reps : g;
                  return (
                    <div key={ex} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2 w-32 truncate">{ex}</span>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Serie</span>
                           <input type="number" className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md px-2 py-1 text-center text-sm" value={s} onChange={(e) => setGoals((p) => ({ ...p, daily: { ...p.daily, [ex]: { sets: e.target.value, reps: r || 0 }, }, }))} />
                        </div>
                        <div className="text-gray-400 pt-3">x</div>
                        <div className="flex flex-col items-center">
                           <span className="text-[9px] text-gray-400 font-bold uppercase mb-0.5">Powt.</span>
                           <input type="number" className="w-16 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md px-2 py-1 text-center text-sm" value={r} onChange={(e) => setGoals((p) => ({ ...p, daily: { ...p.daily, [ex]: { sets: s || 0, reps: e.target.value }, }, }))} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Cardio</h4>
              <div className="grid grid-cols-1 gap-4">
                {cardioList.map((type) => (
                  <div key={type} className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-100 dark:border-blue-800">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-300 ml-2 w-24">{type}</span>
                    <div className="flex gap-2">
                       <div className="flex flex-col items-center">
                         <span className="text-[9px] text-blue-400 font-bold uppercase mb-0.5">Min</span>
                         <input type="number" className="w-20 border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 rounded-md px-2 py-1 text-center text-sm" value={goals.daily[`${type}_time`] || ''} onChange={(e) => setGoals((p) => ({ ...p, daily: { ...p.daily, [`${type}_time`]: e.target.value, }, }))} />
                       </div>
                       <div className="flex flex-col items-center">
                         <span className="text-[9px] text-green-500 font-bold uppercase mb-0.5">Km</span>
                         <input type="number" className="w-20 border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-800 rounded-md px-2 py-1 text-center text-sm" value={goals.daily[`${type}_km`] || ''} onChange={(e) => setGoals((p) => ({ ...p, daily: { ...p.daily, [`${type}_km`]: e.target.value, }, }))} />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2"><Calendar size={18} className="text-purple-500" /> Cele Tygodniowe (Suma)</h3>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Siłowe (Total Powtórzeń)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {exercisesList.map((ex) => (
                  <div key={ex} className="flex flex-col justify-between bg-gray-50 dark:bg-gray-700/30 rounded-lg p-3 border border-gray-100 dark:border-gray-700">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{ex}</span>
                    <div className="flex items-center gap-2">
                         <span className="text-[10px] text-gray-400 font-bold uppercase">Cel:</span>
                         <input type="number" className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md px-2 py-1 text-center text-sm" value={goals.weekly[ex] || ''} onChange={(e) => setGoals((p) => ({ ...p, weekly: { ...p.weekly, [ex]: e.target.value }, }))} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Cardio</h4>
              <div className="grid grid-cols-1 gap-4">
                {cardioList.map((type) => (
                  <div key={type} className="flex items-center justify-between bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-100 dark:border-purple-800">
                    <span className="text-sm font-medium text-purple-900 dark:text-purple-300 ml-2 w-24">{type}</span>
                    <div className="flex gap-2">
                       <div className="flex flex-col items-center">
                         <span className="text-[9px] text-purple-400 font-bold uppercase mb-0.5">Min</span>
                         <input type="number" className="w-20 border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 rounded-md px-2 py-1 text-center text-sm" value={goals.weekly[`${type}_time`] || ''} onChange={(e) => setGoals((p) => ({ ...p, weekly: { ...p.weekly, [`${type}_time`]: e.target.value, }, }))} />
                       </div>
                       <div className="flex flex-col items-center">
                         <span className="text-[9px] text-purple-400 font-bold uppercase mb-0.5">Km</span>
                         <input type="number" className="w-20 border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-800 rounded-md px-2 py-1 text-center text-sm" value={goals.weekly[`${type}_km`] || ''} onChange={(e) => setGoals((p) => ({ ...p, weekly: { ...p.weekly, [`${type}_km`]: e.target.value, }, }))} />
                       </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderChartsView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300 font-bold text-sm">
          <Filter size={16} />
          <span>Zakres:</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <CustomDatePicker value={dateRange.start} onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })} label="Od" className="flex-1 sm:flex-none" />
          <ArrowRight size={16} className="text-gray-300 hidden sm:block" />
          <CustomDatePicker value={dateRange.end} onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })} label="Do" className="flex-1 sm:flex-none" />
        </div>
      </div>

      <Card>
        <Label>Wykres ćwiczeń (Powtórzenia)</Label>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#fff' : '#000' }} />
              <Legend />
              {exercisesList.map((ex, idx) => (
                <Line key={ex} type="monotone" dataKey={ex} stroke={`hsl(${idx * 137.5}, 70%, 50%)`} strokeWidth={2} dot={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Label>Wykres Cardio</Label>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} tickFormatter={(val) => val.slice(5)} />
              <YAxis yAxisId="left" stroke="#10b981" tick={{ fontSize: 12 }} label={{ value: 'km', angle: -90, position: 'insideLeft' }} />
              <YAxis yAxisId="right" orientation="right" stroke="#3b82f6" tick={{ fontSize: 12 }} label={{ value: 'min', angle: 90, position: 'insideRight' }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#fff' : '#000' }} />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="cardioKm" name="Dystans (km)" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              <Line yAxisId="right" type="monotone" dataKey="cardioTime" name="Czas (min)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <Label>Wykres Wagi</Label>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
              <YAxis domain={['auto', 'auto']} stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: isDarkMode ? '#1f2937' : '#fff', color: isDarkMode ? '#fff' : '#000' }} />
              <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );

  const renderHistoryView = () => (
    <div className="space-y-6 animate-in fade-in duration-300">
      <ActivityHeatmap logs={logs} goals={goals} />
      <div className="grid grid-cols-1 gap-4">
        {chartData.filter((d) => d.weight || d.cardioTime > 0 || Object.keys(d).some((k) => exercisesList.includes(k) && d[k]))
          .sort((a, b) => b.date.localeCompare(a.date))
          .map((log) => (
            <Card key={log.date} className="flex flex-col md:flex-row gap-4 items-center">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 text-center min-w-[100px]">
                <div className="text-lg font-bold text-gray-800 dark:text-gray-100">{log.date}</div>
                {log.weight && <div className="text-purple-600 dark:text-purple-400 font-bold text-sm">{log.weight} kg</div>}
              </div>
              <div className="flex-1 w-full grid grid-cols-2 gap-4">
                <div>
                  {exercisesList.map((ex) => {
                    const rawData = logs[log.date]?.exercises?.[ex];
                    const current = getTotalReps(rawData);
                    const goal = goals.daily[ex];
                    const goalTotal = getGoalTotal(goal);
                    let detailStr = formatHistoryString(rawData);
                    if (!rawData) return null;
                    const isExceeded = goalTotal > 0 && current > goalTotal;

                    return (
                      <div key={ex} className="flex justify-between items-end text-sm border-b border-gray-100 dark:border-gray-700 last:border-0 py-2">
                        <div className="text-gray-600 dark:text-gray-300 font-medium flex items-center gap-1">
                          {ex}
                          {isExceeded && <Flame size={12} className="text-red-500 fill-red-500 animate-pulse" />}
                        </div>
                        <div className="text-right w-1/2">
                          <span className="font-bold block text-gray-900 dark:text-gray-100">{current} <span className="text-[10px] text-gray-400 font-normal">total</span></span>
                          <ProgressBar current={current} target={goalTotal} unit="" size="sm" />
                          {detailStr && <span className="text-[10px] text-gray-400 block mt-1">{detailStr}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div>
                   {(log.cardioKm > 0 || log.cardioTime > 0) && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-sm text-blue-800 dark:text-blue-200">
                      <div className="font-bold mb-1">Cardio Total</div>
                      <div className="mb-2">{log.cardioKm} km / {log.cardioKcal} kcal / {log.cardioTime} min</div>
                      {cardioList.map((type) => {
                        const cData = logs[log.date]?.cardio?.[type];
                        if (!cData) return null;
                        const gKm = goals.daily[`${type}_km`];
                        const gTime = goals.daily[`${type}_time`];
                        const isExceeded = (gKm && cData.km > gKm) || (gTime && cData.time > gTime);
                        return (
                          <div key={type} className="mt-1 border-t border-blue-100 dark:border-blue-800 pt-1">
                            <div className="text-[10px] font-bold flex items-center gap-1">
                              {type} {isExceeded && <Flame size={10} className="text-red-500 fill-red-500 animate-pulse" />}
                            </div>
                            {gKm && <ProgressBar current={cData.km} target={gKm} unit="km" size="sm" colorClass="bg-teal-500" />}
                            {gTime && <ProgressBar current={cData.time} target={gTime} unit="min" size="sm" colorClass="bg-blue-500" />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen p-4 md:p-8 font-sans pb-20 transition-colors duration-300 ${isDarkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      
      {/* Modal Logowania */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center text-white">
              <Dumbbell size={20} className="transform -rotate-45" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 dark:text-white">GymBuddy</h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Twój plan treningowy</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg overflow-x-auto">
              {['day', 'goals', 'charts', 'history'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-black dark:bg-white text-white dark:text-black shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {tab === 'day' ? 'Dzień' : tab === 'goals' ? 'Cele' : tab === 'charts' ? 'Wykresy' : 'Historia'}
                </button>
              ))}
            </div>
            
            {/* PRZYCISK LOGOWANIA / WYLOGOWANIA */}
            {session ? (
               <button 
                 onClick={handleLogout}
                 className="p-2.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                 title="Wyloguj się"
               >
                 <LogOut size={20} />
               </button>
             ) : (
               <button 
                 onClick={() => setIsAuthOpen(true)}
                 className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                 title="Zaloguj do chmury"
               >
                 <User size={20} />
               </button>
             )}

            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-yellow-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              title="Przełącz motyw"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* Global Date Picker */}
        {activeTab === 'day' && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-3 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors">
            <CustomDatePicker value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full sm:w-auto" />
            <Button onClick={copyLastWorkout} variant="outline" size="sm" className="text-xs whitespace-nowrap"><Copy size={14} /> Kopiuj ostatni</Button>
          </div>
        )}

        <main>{activeTab === 'day' && renderDayView()}{activeTab === 'goals' && renderGoalsView()}{activeTab === 'charts' && renderChartsView()}{activeTab === 'history' && renderHistoryView()}</main>
      </div>
    </div>
  );
}