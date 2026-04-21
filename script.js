const STORAGE_KEY = 'coc7_sheet_autosave_v1';
const SHARE_HASH_PREFIX = '#s=';
const STATE_VERSION = 1;
let SHARE_MODE = false;

// 可集中維護的技能清單（顯示文字含基礎值）
const SKILLS = [
  '會計(05)', '人類學(01)', '估價(05)', '考古學(01)', '魅惑(15)', '攀爬(20)', '電腦使用(05)', '信用評級(00)',
  '克蘇魯神話(00)', '偽裝(05)', '閃避(DEX/2)', '開車(20)', '電子維修(10)', '話術(05)', '法律(05)',
  '圖書館使用(20)', '聆聽(20)', '鎖匠(01)', '機械維修(10)', '醫藥(01)', '自然世界(10)', '導航(10)',
  '神秘學(05)', '操作重機(01)', '說服(10)', '駕駛(01)', '心理學(10)', '精神分析(01)', '騎術(05)',
  '妙手(10)', '識破(25)', '隱匿(20)', '偵查(25)', '游泳(20)', '投擲(20)', '追蹤(10)',
  '歷史(05)', '急救(30)', '威脅(15)', '跳躍(20)', '語言(其他)(01)', '母語(EDU)',
  '藝術/工藝(05)', '戰鬥(徒手)(25)', '戰鬥(00)', '火器(手槍)(20)', '火器(步槍/霰彈槍)(25)',
  '火器(00)', '科學(01)', '生存(10)'
];

// 需要顯示分項輸入欄的分類技能（只比對前綴）
const CATEGORIZED_PREFIXES = ['藝術/工藝', '戰鬥', '火器', '駕駛', '科學', '生存', '語言(其他)'];
const SUBSKILL_HIDDEN_EXACT = ['戰鬥(徒手)(25)', '火器(手槍)(20)', '火器(步槍/霰彈槍)(25)'];

const occupationContainer = document.getElementById('occupationSkills');
const interestContainer = document.getElementById('interestSkills');
const statusSanInitialInput = document.getElementById('status_sanInitial');
const fourFifthsDisplay = document.getElementById('derived_fourFifths');
const shareBtn = document.getElementById('shareBtn');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');
const ATTRIBUTE_CHECK_FIELDS = ['str', 'dex', 'int', 'con', 'app', 'pow', 'siz', 'edu'];

function createSkillSlot(container, group, index) {
  const wrap = document.createElement('div');
  wrap.className = 'skill-slot';

  const selectLabel = document.createElement('label');
  selectLabel.textContent = `${group === 'occupation' ? '職業' : '興趣'}技能 ${index + 1}`;

  const select = document.createElement('select');
  select.id = `skills_${group}_${index}`;
  select.dataset.group = group;
  select.dataset.index = index;

  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '請選擇技能';
  select.appendChild(emptyOption);

  SKILLS.forEach((skillName) => {
    const option = document.createElement('option');
    option.value = skillName;
    option.textContent = skillName;
    select.appendChild(option);
  });

  select.addEventListener('change', () => toggleSubSkillInput(group, index));

  const subWrap = document.createElement('div');
  subWrap.className = 'subskill-wrap hidden';
  subWrap.id = `sub_wrap_${group}_${index}`;

  const subLabel = document.createElement('label');
  subLabel.textContent = '技能分項';
  const subInput = document.createElement('input');
  subInput.type = 'text';
  subInput.id = `skills_${group}_${index}_sub`;
  subInput.placeholder = '例如：化學 / 劍 / 遊艇';

  subLabel.appendChild(subInput);
  subWrap.appendChild(subLabel);

  selectLabel.appendChild(select);
  wrap.appendChild(selectLabel);

  const checkLine = document.createElement('p');
  checkLine.id = `check_skill_${group}_${index}`;
  checkLine.className = 'check-line';
  checkLine.textContent = '一般0 / 困難0 / 極難0';
  wrap.appendChild(checkLine);

  const valueLabel = document.createElement('label');
  valueLabel.textContent = '技能數值';
  const valueInput = document.createElement('input');
  valueInput.type = 'number';
  valueInput.inputMode = 'numeric';
  valueInput.id = `skills_${group}_${index}_value`;
  valueInput.addEventListener('input', () => updateSkillCheck(group, index));
  valueLabel.appendChild(valueInput);
  wrap.appendChild(valueLabel);

  wrap.appendChild(subWrap);

  container.appendChild(wrap);
}

function toggleSubSkillInput(group, index) {
  const select = document.getElementById(`skills_${group}_${index}`);
  const subWrap = document.getElementById(`sub_wrap_${group}_${index}`);
  const selected = select.value;

  const hasCategorizedPrefix = CATEGORIZED_PREFIXES.some((prefix) => selected.startsWith(prefix));
  const needsSubSkill = hasCategorizedPrefix && !SUBSKILL_HIDDEN_EXACT.includes(selected);
  subWrap.classList.toggle('hidden', !needsSubSkill);
}

function initSkillsUI() {
  for (let i = 0; i < 8; i += 1) {
    createSkillSlot(occupationContainer, 'occupation', i);
  }
  for (let i = 0; i < 4; i += 1) {
    createSkillSlot(interestContainer, 'interest', i);
  }
}

function updateDerivedInfo() {
  const sanInitial = Number(statusSanInitialInput.value || 0);
  const fourFifths = Math.floor((sanInitial * 4) / 5);
  fourFifthsDisplay.textContent = Number.isFinite(fourFifths) ? String(fourFifths) : '0';
}

function getDerivedBuildAndDamageBonus(sumStrSiz) {
  if (sumStrSiz <= 64) return { build: '-2', damageBonus: '-2' };
  if (sumStrSiz <= 84) return { build: '-1', damageBonus: '-1' };
  if (sumStrSiz <= 124) return { build: '0', damageBonus: '0' };
  if (sumStrSiz <= 164) return { build: '1', damageBonus: '+1D4' };
  if (sumStrSiz <= 204) return { build: '2', damageBonus: '+1D6' };

  const extra = Math.ceil((sumStrSiz - 204) / 80);
  return { build: String(2 + extra), damageBonus: `+${1 + extra}D6` };
}

function calculateMov(str, dex, siz, age) {
  let mov = 8;
  if (dex < siz && str < siz) mov = 7;
  if (dex > siz && str > siz) mov = 9;

  const numericAge = Number(age);
  if (!Number.isFinite(numericAge) || numericAge < 40) return mov;

  const agePenalty = Math.min(5, Math.floor((numericAge - 40) / 10) + 1);
  return Math.max(1, mov - agePenalty);
}

function updateAutoCalculatedStats() {
  const str = Number(getInputValue('attr_str') || 0);
  const con = Number(getInputValue('attr_con') || 0);
  const pow = Number(getInputValue('attr_pow') || 0);
  const siz = Number(getInputValue('attr_siz') || 0);
  const dex = Number(getInputValue('attr_dex') || 0);
  const age = Number(getInputValue('basic_age') || 0);

  const hpMax = Math.floor((con + siz) / 10);
  const mpMax = Math.floor(pow / 5);
  const mov = calculateMov(str, dex, siz, age);
  const { build, damageBonus } = getDerivedBuildAndDamageBonus(str + siz);

  setInputValue('status_hpMax', String(Math.max(hpMax, 0)));
  setInputValue('status_mpMax', String(Math.max(mpMax, 0)));
  setInputValue('attr_mov', String(Math.max(mov, 0)));
  setInputValue('attr_build', build);
  setInputValue('attr_damageBonus', damageBonus);
}

function formatCheckText(value) {
  const normal = Number(value || 0);
  const hard = Math.floor(normal / 2);
  const extreme = Math.floor(normal / 5);
  return `一般${normal} / 困難${hard} / 極難${extreme}`;
}

function updateAttributeChecks() {
  ATTRIBUTE_CHECK_FIELDS.forEach((field) => {
    const value = getInputValue(`attr_${field}`);
    const target = document.getElementById(`check_attr_${field}`);
    if (target) target.textContent = formatCheckText(value);
  });
}

function updateSkillCheck(group, index) {
  const value = getInputValue(`skills_${group}_${index}_value`);
  const target = document.getElementById(`check_skill_${group}_${index}`);
  if (target) target.textContent = formatCheckText(value);
}

function updateAllSkillChecks() {
  for (let i = 0; i < 8; i += 1) updateSkillCheck('occupation', i);
  for (let i = 0; i < 4; i += 1) updateSkillCheck('interest', i);
}

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function refreshDerivedUI() {
  updateDerivedInfo();
  updateAttributeChecks();
  updateAllSkillChecks();
  updateAutoCalculatedStats();
}

function collectState() {
  const fields = {};
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (!el.id) return;
    fields[el.id] = el.type === 'checkbox' ? Boolean(el.checked) : String(el.value ?? '');
  });

  return {
    version: STATE_VERSION,
    fields
  };
}

function applyState(state) {
  if (!state || typeof state !== 'object' || !state.version || !state.fields || typeof state.fields !== 'object') {
    return;
  }

  Object.entries(state.fields).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (!el) return;

    if (el.type === 'checkbox') {
      el.checked = Boolean(value);
    } else {
      el.value = value == null ? '' : String(value);
    }

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });

  refreshDerivedUI();
}

function encodeUtf8ToBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function decodeBase64ToUtf8(base64Text) {
  const binary = atob(base64Text);
  const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeStateToHash(state) {
  const json = JSON.stringify(state);
  const payload = encodeUtf8ToBase64(json);
  return `${SHARE_HASH_PREFIX}${payload}`;
}

function decodeStateFromHash() {
  const hash = window.location.hash || '';
  if (!hash.startsWith(SHARE_HASH_PREFIX)) return null;

  try {
    const payload = hash.slice(SHARE_HASH_PREFIX.length);
    const jsonText = decodeBase64ToUtf8(payload);
    const parsed = JSON.parse(jsonText);

    if (!parsed || typeof parsed !== 'object' || !('version' in parsed) || !('fields' in parsed) || typeof parsed.fields !== 'object') {
      throw new Error('state 格式不正確');
    }

    if (parsed.version !== STATE_VERSION) {
      console.warn(`state version 不符：${parsed.version}`);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('hash decode/parse 失敗', error);
    return null;
  }
}

function saveToLocal() {
  if (SHARE_MODE) return;
  const state = collectState();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function restoreFromLocal() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return false;

  try {
    const parsed = JSON.parse(raw);
    applyState(parsed);
    return true;
  } catch (error) {
    console.error('localStorage restore 失敗', error);
    return false;
  }
}

async function copyShareUrl() {
  const state = collectState();
  const hash = encodeStateToHash(state);
  const fullUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${hash}`;

  if (fullUrl.length > 4000) {
    window.alert('網址過長可能不穩定');
  }

  try {
    await navigator.clipboard.writeText(fullUrl);
    showStatus('分享網址已複製');
  } catch (error) {
    window.prompt('請手動複製分享網址：', fullUrl);
  }
}

function gatherFormData() {
  const occupationSkills = [];
  const interestSkills = [];

  for (let i = 0; i < 8; i += 1) {
    occupationSkills.push({
      skill: getInputValue(`skills_occupation_${i}`),
      subSkill: getInputValue(`skills_occupation_${i}_sub`),
      value: getInputValue(`skills_occupation_${i}_value`)
    });
  }

  for (let i = 0; i < 4; i += 1) {
    interestSkills.push({
      skill: getInputValue(`skills_interest_${i}`),
      subSkill: getInputValue(`skills_interest_${i}_sub`),
      value: getInputValue(`skills_interest_${i}_value`)
    });
  }

  return {
    basic: {
      name: getInputValue('basic_name'),
      age: getInputValue('basic_age'),
      job: getInputValue('basic_job')
    },
    attributes: {
      str: getInputValue('attr_str'), dex: getInputValue('attr_dex'), int: getInputValue('attr_int'),
      con: getInputValue('attr_con'), app: getInputValue('attr_app'), pow: getInputValue('attr_pow'),
      siz: getInputValue('attr_siz'), edu: getInputValue('attr_edu'), mov: getInputValue('attr_mov'),
      luk: getInputValue('attr_luk'), damageBonus: getInputValue('attr_damageBonus'), build: getInputValue('attr_build')
    },
    status: {
      hpCurrent: getInputValue('status_hpCurrent'), hpMax: getInputValue('status_hpMax'),
      mpCurrent: getInputValue('status_mpCurrent'), mpMax: getInputValue('status_mpMax'),
      sanCurrent: getInputValue('status_sanCurrent'), sanMax: getInputValue('status_sanMax'),
      sanInitial: getInputValue('status_sanInitial')
    },
    derived: {
      fourFifthsSan: Math.floor((Number(getInputValue('status_sanInitial') || 0) * 4) / 5),
      insanityHint: '單日累積失去 1/5 起始 SAN 時，可能進入不定性瘋狂'
    },
    skills: {
      occupation: occupationSkills,
      creditRating: getInputValue('skills_creditRating'),
      interest: interestSkills,
      other: getInputValue('skills_other')
    },
    background: {
      description: getInputValue('bg_description'),
      belief: getInputValue('bg_belief'),
      person: getInputValue('bg_person'),
      place: getInputValue('bg_place'),
      item: getInputValue('bg_item'),
      trait: getInputValue('bg_trait'),
      wound: getInputValue('bg_wound'),
      phobia: getInputValue('bg_phobia'),
      arcane: getInputValue('bg_arcane'),
      encounter: getInputValue('bg_encounter')
    },
    notes: {
      profile: getInputValue('notes_profile'),
      items: getInputValue('notes_items')
    }
  };
}

function fillFormFromData(data) {
  setInputValue('basic_name', data.basic?.name);
  setInputValue('basic_age', data.basic?.age);
  setInputValue('basic_job', data.basic?.job);

  setInputValue('attr_str', data.attributes?.str);
  setInputValue('attr_dex', data.attributes?.dex);
  setInputValue('attr_int', data.attributes?.int);
  setInputValue('attr_con', data.attributes?.con);
  setInputValue('attr_app', data.attributes?.app);
  setInputValue('attr_pow', data.attributes?.pow);
  setInputValue('attr_siz', data.attributes?.siz);
  setInputValue('attr_edu', data.attributes?.edu);
  setInputValue('attr_mov', data.attributes?.mov);
  setInputValue('attr_luk', data.attributes?.luk);
  setInputValue('attr_damageBonus', data.attributes?.damageBonus);
  setInputValue('attr_build', data.attributes?.build);

  setInputValue('status_hpCurrent', data.status?.hpCurrent);
  setInputValue('status_hpMax', data.status?.hpMax);
  setInputValue('status_mpCurrent', data.status?.mpCurrent);
  setInputValue('status_mpMax', data.status?.mpMax);
  setInputValue('status_sanCurrent', data.status?.sanCurrent);
  setInputValue('status_sanMax', data.status?.sanMax);
  setInputValue('status_sanInitial', data.status?.sanInitial);

  const occupation = data.skills?.occupation || [];
  const interest = data.skills?.interest || [];

  for (let i = 0; i < 8; i += 1) {
    setInputValue(`skills_occupation_${i}`, occupation[i]?.skill || '');
    setInputValue(`skills_occupation_${i}_sub`, occupation[i]?.subSkill || '');
    setInputValue(`skills_occupation_${i}_value`, occupation[i]?.value || '');
    toggleSubSkillInput('occupation', i);
    updateSkillCheck('occupation', i);
  }

  for (let i = 0; i < 4; i += 1) {
    setInputValue(`skills_interest_${i}`, interest[i]?.skill || '');
    setInputValue(`skills_interest_${i}_sub`, interest[i]?.subSkill || '');
    setInputValue(`skills_interest_${i}_value`, interest[i]?.value || '');
    toggleSubSkillInput('interest', i);
    updateSkillCheck('interest', i);
  }

  setInputValue('skills_creditRating', data.skills?.creditRating);
  setInputValue('skills_other', data.skills?.other);

  setInputValue('bg_description', data.background?.description);
  setInputValue('bg_belief', data.background?.belief);
  setInputValue('bg_person', data.background?.person);
  setInputValue('bg_place', data.background?.place);
  setInputValue('bg_item', data.background?.item);
  setInputValue('bg_trait', data.background?.trait);
  setInputValue('bg_wound', data.background?.wound);
  setInputValue('bg_phobia', data.background?.phobia);
  setInputValue('bg_arcane', data.background?.arcane);
  setInputValue('bg_encounter', data.background?.encounter);

  setInputValue('notes_profile', data.notes?.profile);
  setInputValue('notes_items', data.notes?.items);

  updateDerivedInfo();
  updateAttributeChecks();
  updateAutoCalculatedStats();
}

function clearAllInputs() {
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    el.value = '';
  });

  for (let i = 0; i < 8; i += 1) toggleSubSkillInput('occupation', i);
  for (let i = 0; i < 4; i += 1) toggleSubSkillInput('interest', i);

  updateDerivedInfo();
  updateAttributeChecks();
  updateAllSkillChecks();
  updateAutoCalculatedStats();
}

function showStatus(message) {
  statusMessage.textContent = message;
  setTimeout(() => {
    if (statusMessage.textContent === message) {
      statusMessage.textContent = '';
    }
  }, 2400);
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tab');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });
}

function setupActions() {
  statusSanInitialInput.addEventListener('input', updateDerivedInfo);
  document.getElementById('basic_age')?.addEventListener('input', updateAutoCalculatedStats);
  ATTRIBUTE_CHECK_FIELDS.forEach((field) => {
    const input = document.getElementById(`attr_${field}`);
    if (input) {
      input.addEventListener('input', updateAttributeChecks);
      input.addEventListener('input', updateAutoCalculatedStats);
    }
  });

  saveBtn.addEventListener('click', () => {
    saveToLocal();
    showStatus('已儲存');
  });

  clearBtn.addEventListener('click', () => {
    const confirmed = window.confirm('確定要清除全部資料嗎？此動作無法復原。');
    if (!confirmed) return;

    clearAllInputs();
    localStorage.removeItem(STORAGE_KEY);
    showStatus('已清除');
  });

  document.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', saveToLocal);
    el.addEventListener('change', saveToLocal);
  });

  if (shareBtn) {
    shareBtn.addEventListener('click', copyShareUrl);
  }
}

function boot() {
  const hashState = decodeStateFromHash();
  if (hashState) {
    SHARE_MODE = true;
    applyState(hashState);
    console.log('已從分享網址還原角色卡');
    return;
  }

  if (window.location.hash.startsWith(SHARE_HASH_PREFIX)) {
    console.error('分享網址解析失敗，改為讀取本機資料');
  }

  restoreFromLocal();
}

function init() {
  initSkillsUI();
  setupTabs();
  setupActions();
  refreshDerivedUI();
  boot();
}

init();
