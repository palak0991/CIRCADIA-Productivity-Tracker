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

// ── Smart Technical Acronym Dictionary ─────────────────────────────────────
const TECH_ACRONYMS = {
  dbms: 'DBMS', sql: 'SQL', nosql: 'NoSQL', dsa: 'DSA', api: 'API', apis: 'APIs',
  rest: 'REST', ai: 'AI', ml: 'ML', nlp: 'NLP', os: 'OS', cn: 'CN', aws: 'AWS',
  gcp: 'GCP', ui: 'UI', ux: 'UX', 'ui/ux': 'UI/UX', pr: 'PR', prs: 'PRs',
  'ci/cd': 'CI/CD', cicd: 'CI/CD', oop: 'OOP', oops: 'OOP', llm: 'LLM',
  docker: 'Docker', python: 'Python', java: 'Java', react: 'React',
  springboot: 'Spring Boot', leetcode: 'LeetCode'
};

const CATEGORY_KEYWORDS = {
  work: ['work', 'project', 'assignment', 'meeting', 'code', 'coding', 'client', 'pr', 'bug', 'deploy', 'standup', 'sync', 'interview', 'review'],
  study: ['study', 'dbms', 'sql', 'dsa', 'exam', 'reading', 'read', 'lecture', 'book', 'course', 'learn', 'math', 'homework', 'notes', 'tutorial', 'leetcode'],
  fitness: ['gym', 'run', 'workout', 'exercise', 'walk', 'yoga', 'cardio', 'training', 'swim', 'stretch', 'cycling'],
  personal: ['personal', 'dinner', 'lunch', 'breakfast', 'errand', 'doctor', 'relax', 'movie', 'game', 'grocery', 'shopping', 'chores']
};

export const clientSideParseTaskNL = (text, timezone, availableCategories = []) => {
  const clean = text.trim();
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');

  // 1. Time range regex: "from 5 to 6pm", "5 to 6pm", "5-6pm", "between 2 and 4pm", "11pm to 7am"
  const rangeRegex = /\b(?:from\s+|between\s+)?(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\s*(?:to|-|until|till|through|and)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b/i;
  const singleTimeRegex = /\b(?:at|around|@|starts?\s+at|starting\s+at)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?|noon|midnight)\b/i;
  const durationRegex = /\b(?:for\s+)?(\d+(?:\.\d+)?|half|one|two|three|four|five)\s*(hours?|hrs?|minutes?|mins?)\b/i;
  const compoundDurRegex = /\b(?:for\s+)?(\d+)\s*(?:hours?|hrs?)\s*(?:and\s+)?(\d+)\s*(?:minutes?|mins?)\b/i;

  let startH = null, startM = 0;
  let endH = null, endM = 0;
  let durMins = null;
  let matchedSpans = [];

  const parseToken = (tok, defMeridiem) => {
    const l = tok.toLowerCase().trim();
    if (l === 'noon') return { h: 12, m: 0 };
    if (l === 'midnight') return { h: 0, m: 0 };
    const m = l.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mins = m[2] ? parseInt(m[2], 10) : 0;
    const meridiem = m[3] || defMeridiem;
    if (meridiem === 'pm' && h < 12) h += 12;
    else if (meridiem === 'am' && h === 12) h = 0;
    return { h, m: mins };
  };

  const rangeMatch = clean.match(rangeRegex);
  if (rangeMatch) {
    matchedSpans.push(rangeMatch[0]);
    const t1Str = rangeMatch[1].trim();
    const t2Str = rangeMatch[2].trim();
    const t2Meridiem = /pm/i.test(t2Str) ? 'pm' : (/am/i.test(t2Str) ? 'am' : null);
    let t1Meridiem = /pm/i.test(t1Str) ? 'pm' : (/am/i.test(t1Str) ? 'am' : null);

    const m1Num = parseInt(t1Str.match(/^\d{1,2}/)?.[0] || '0', 10);
    const m2Num = parseInt(t2Str.match(/^\d{1,2}/)?.[0] || '0', 10);

    if (!t1Meridiem && t2Meridiem === 'pm') {
      t1Meridiem = m1Num < m2Num ? 'pm' : (m1Num > m2Num ? 'am' : 'pm');
    } else if (!t1Meridiem && !t2Meridiem) {
      if (m1Num < 7) {
        t1Meridiem = 'pm';
      }
    }

    const t2 = parseToken(t2Str, t2Meridiem || t1Meridiem);
    const t1 = parseToken(t1Str, t1Meridiem || t2Meridiem);

    if (t1 && t2) {
      startH = t1.h; startM = t1.m;
      endH = t2.h; endM = t2.m;
      let diff = (endH * 60 + endM) - (startH * 60 + startM);
      if (diff <= 0) diff += 1440; // Midnight crossing
      durMins = diff;
    }
  } else {
    const singleMatch = clean.match(singleTimeRegex);
    if (singleMatch) {
      matchedSpans.push(singleMatch[0]);
      let defMer = /pm/i.test(clean) ? 'pm' : (/am/i.test(clean) ? 'am' : null);
      const st = parseToken(singleMatch[1], defMer);
      if (st) {
        startH = st.h; startM = st.m;
      }
    }
  }

  // Duration check
  const compMatch = clean.match(compoundDurRegex);
  if (compMatch) {
    matchedSpans.push(compMatch[0]);
    durMins = parseInt(compMatch[1], 10) * 60 + parseInt(compMatch[2], 10);
  } else {
    const durMatch = clean.match(durationRegex);
    if (durMatch) {
      matchedSpans.push(durMatch[0]);
      const numStr = durMatch[1].toLowerCase();
      const unit = durMatch[2].toLowerCase();
      let val = numStr === 'half' ? 0.5 : (numStr === 'one' ? 1 : (numStr === 'two' ? 2 : parseFloat(numStr) || 1));
      durMins = /hour|hr/i.test(unit) ? Math.round(val * 60) : Math.round(val);
    }
  }

  if (startH !== null && durMins && endH === null) {
    const totalEnd = startH * 60 + startM + durMins;
    endH = Math.floor(totalEnd / 60) % 24;
    endM = totalEnd % 60;
  }

  // 2. Relative date resolution
  let targetDate = new Date(now);
  if (/\bday\s+after\s+tomorrow\b/i.test(clean)) {
    matchedSpans.push('day after tomorrow');
    targetDate.setDate(targetDate.getDate() + 2);
  } else if (/\btomorrow\b/i.test(clean)) {
    matchedSpans.push('tomorrow');
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (/\byesterday\b/i.test(clean)) {
    matchedSpans.push('yesterday');
    targetDate.setDate(targetDate.getDate() - 1);
  } else if (/\b(today|tonight|this\s+morning|this\s+evening)\b/i.test(clean)) {
    const m = clean.match(/\b(today|tonight|this\s+morning|this\s+evening)\b/i);
    if (m) matchedSpans.push(m[0]);
  }

  const dateStr = `${targetDate.getFullYear()}-${pad(targetDate.getMonth() + 1)}-${pad(targetDate.getDate())}`;

  // 3. Clean Title & Acronym formatting
  let rawTitle = clean;
  matchedSpans.forEach(span => {
    rawTitle = rawTitle.replace(span, ' ');
  });
  rawTitle = rawTitle.replace(/\s+/g, ' ').replace(/\b(at|on|for|from|to|starts?|starting)\b\s*$/i, '').trim();
  rawTitle = rawTitle.replace(/^\s*(at|on|for|from|to|scheduled\s+for)\b/i, '').trim();

  const words = (rawTitle || clean).split(' ');
  const formattedWords = words.map((w, idx) => {
    const core = w.replace(/[^a-zA-Z0-9/-]/g, '').toLowerCase();
    if (TECH_ACRONYMS[core]) {
      return w.replace(new RegExp(core, 'i'), TECH_ACRONYMS[core]);
    }
    if (idx === 0) return w.charAt(0).toUpperCase() + w.slice(1);
    return w;
  });
  const title = formattedWords.join(' ') || 'New Task';

  // 4. Category matching
  let matchedCatId = null;
  let matchedCatName = null;
  const lowText = clean.toLowerCase();

  for (const cat of availableCategories) {
    const cName = cat.name.toLowerCase();
    if (new RegExp(`\\b${cName}\\b`, 'i').test(lowText)) {
      matchedCatId = cat.id;
      matchedCatName = cat.name;
      break;
    }
    for (const [group, kwList] of Object.entries(CATEGORY_KEYWORDS)) {
      if (cName.includes(group)) {
        if (kwList.some(kw => new RegExp(`\\b${kw}\\b`, 'i').test(lowText))) {
          matchedCatId = cat.id;
          matchedCatName = cat.name;
          break;
        }
      }
    }
    if (matchedCatId) break;
  }

  const startTimeStr = startH !== null ? `${pad(startH)}:${pad(startM)}` : null;
  const endTimeStr = endH !== null ? `${pad(endH)}:${pad(endM)}` : null;

  let startIso = null;
  let endIso = null;
  if (startTimeStr) {
    const sD = new Date(`${dateStr}T${startTimeStr}:00`);
    startIso = sD.toISOString();
  }
  if (endTimeStr) {
    let eD = new Date(`${dateStr}T${endTimeStr}:00`);
    if (startH !== null && (endH < startH || (endH === startH && endM < startM))) {
      eD.setDate(eD.getDate() + 1); // Cross midnight
    }
    endIso = eD.toISOString();
  }

  return {
    originalText: text,
    title,
    description: text,
    date: dateStr,
    startTime: startTimeStr,
    endTime: endTimeStr,
    durationMinutes: durMins || (startH !== null && endH !== null ? (endH * 60 + endM) - (startH * 60 + startM) : null),
    categoryId: matchedCatId,
    categoryName: matchedCatName,
    startDateTime: startIso,
    endDateTime: endIso,
    missingFields: [],
    needsConfirmation: false,
    clarificationQuestions: [],
    confidenceScore: 0.95
  };
};

export const parseTaskNL = async (text, timezone, availableCategories = []) => {
  const userTz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  try {
    const response = await api.post('/nlp/parse-task', {
      text,
      timezone: userTz
    });
    return response.data;
  } catch (err) {
    console.warn('Backend NLP parsing endpoint failed or offline, seamlessly using client fallback:', err);
    return clientSideParseTaskNL(text, userTz, availableCategories);
  }
};
