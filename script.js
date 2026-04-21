const STORAGE_KEY = 'coc7CharacterCardData';

// 可集中維護的技能清單（顯示文字含基礎值）
const SKILLS = [
  '會計(05)', '人類學(01)', '估價(05)', '考古學(01)', '魅惑(15)', '攀爬(20)', '信用評級(00)',
  '克蘇魯神話(00)', '偽裝(05)', '閃避(DEX/2)', '開車(20)', '電子維修(10)', '話術(05)', '法律(05)',
  '圖書館使用(20)', '聆聽(20)', '鎖匠(01)', '機械維修(10)', '醫藥(01)', '自然世界(10)', '導航(10)',
  '神秘學(05)', '操作重機(01)', '說服(10)', '駕駛(01)', '心理學(10)', '精神分析(01)', '騎術(05)',
  '妙手(10)', '識破(25)', '隱匿(20)', '偵查(25)', '游泳(20)', '投擲(20)', '追蹤(10)',
  '歷史(05)', '急救(30)', '威脅(15)', '跳躍(20)', '語言(其他)(01)', '母語(EDU)',
  '藝術/工藝(05)', '戰鬥(徒手)(25)', '戰鬥(00)', '火器(手槍)(20)', '火器(步槍/霰彈槍)(25)',
  '火器(00)', '科學(01)', '生存(10)'
];

// 需要顯示分項輸入欄的分類技能（只比對前綴）
const CATEGORIZED_PREFIXES = ['藝術/工藝', '戰鬥', '火器', '駕駛', '科學', '生存'];

const occupationContainer = document.getElementById('occupationSkills');
const interestContainer = document.getElementById('interestSkills');
const statusSanInitialInput = document.getElementById('status_sanInitial');
const fourFifthsDisplay = document.getElementById('derived_fourFifths');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const statusMessage = document.getElementById('statusMessage');

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
  wrap.appendChild(subWrap);

  container.appendChild(wrap);
}

function toggleSubSkillInput(group, index) {
  const select = document.getElementById(`skills_${group}_${index}`);
  const subWrap = document.getElementById(`sub_wrap_${group}_${index}`);
  const selected = select.value;

  const needsSubSkill = CATEGORIZED_PREFIXES.some((prefix) => selected.startsWith(prefix));
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

function getInputValue(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function setInputValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? '';
}

function gatherFormData() {
  const occupationSkills = [];
  const interestSkills = [];

  for (let i = 0; i < 8; i += 1) {
    occupationSkills.push({
      skill: getInputValue(`skills_occupation_${i}`),
      subSkill: getInputValue(`skills_occupation_${i}_sub`)
    });
  }

  for (let i = 0; i < 4; i += 1) {
    interestSkills.push({
      skill: getInputValue(`skills_interest_${i}`),
      subSkill: getInputValue(`skills_interest_${i}_sub`)
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
    toggleSubSkillInput('occupation', i);
  }

  for (let i = 0; i < 4; i += 1) {
    setInputValue(`skills_interest_${i}`, interest[i]?.skill || '');
    setInputValue(`skills_interest_${i}_sub`, interest[i]?.subSkill || '');
    toggleSubSkillInput('interest', i);
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
}

function clearAllInputs() {
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    el.value = '';
  });

  for (let i = 0; i < 8; i += 1) toggleSubSkillInput('occupation', i);
  for (let i = 0; i < 4; i += 1) toggleSubSkillInput('interest', i);

  updateDerivedInfo();
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

function loadSavedData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;

  try {
    const parsed = JSON.parse(raw);
    fillFormFromData(parsed);
    showStatus('已載入已儲存資料');
  } catch (error) {
    console.error('資料解析失敗', error);
  }
}

function setupActions() {
  statusSanInitialInput.addEventListener('input', updateDerivedInfo);

  saveBtn.addEventListener('click', () => {
    const data = gatherFormData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    showStatus('已儲存');
  });

  clearBtn.addEventListener('click', () => {
    const confirmed = window.confirm('確定要清除全部資料嗎？此動作無法復原。');
    if (!confirmed) return;

    clearAllInputs();
    localStorage.removeItem(STORAGE_KEY);
    showStatus('已清除');
  });
}

function init() {
  initSkillsUI();
  setupTabs();
  setupActions();
  updateDerivedInfo();
  loadSavedData();
}

init();
