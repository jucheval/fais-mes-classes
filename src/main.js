import { classifyFromCsvTexts } from './classifier.js';
import { parseCsvText } from './csv.js';

const studentsFileInput = document.getElementById('studentsFile');
const groupsFileInput = document.getElementById('groupsFile');
const pickStudentsBtn = document.getElementById('pickStudentsBtn');
const pickGroupsBtn = document.getElementById('pickGroupsBtn');
const runBtn = document.getElementById('runBtn');
const exportBtn = document.getElementById('exportBtn');
const copyBtn = document.getElementById('copyBtn');
const copyStatus = document.getElementById('copyStatus');
const errorBox = document.getElementById('errorBox');
const resultBlocks = document.getElementById('resultBlocks');
const studentsPreview = document.getElementById('studentsPreview');
const groupsPreview = document.getElementById('groupsPreview');
const studentsFileName = document.getElementById('studentsFileName');
const groupsFileName = document.getElementById('groupsFileName');
const showStudentsFullBtn = document.getElementById('showStudentsFullBtn');
const showGroupsFullBtn = document.getElementById('showGroupsFullBtn');
const csvModal = document.getElementById('csvModal');
const csvModalTitle = document.getElementById('csvModalTitle');
const csvModalContent = document.getElementById('csvModalContent');
const csvModalCloseBtn = document.getElementById('csvModalCloseBtn');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeStorageKey = 'fais-mes-classes-theme';
const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

let lastResult = null;
let lastStudentsCsvText = '';
let lastGroupsCsvText = '';

function setTheme(theme) {
  const isDark = theme === 'dark';
  document.body.dataset.theme = isDark ? 'dark' : 'light';
  themeToggleBtn.setAttribute('aria-pressed', String(isDark));
  themeToggleBtn.setAttribute(
    'aria-label',
    isDark ? 'Activer le thème clair' : 'Activer le thème sombre',
  );
}

const storedTheme = localStorage.getItem(themeStorageKey);
const initialTheme = storedTheme === 'dark' || storedTheme === 'light'
  ? storedTheme
  : systemThemeQuery.matches ? 'dark' : 'light';
setTheme(initialTheme);

systemThemeQuery.addEventListener('change', (event) => {
  if (!localStorage.getItem(themeStorageKey)) {
    setTheme(event.matches ? 'dark' : 'light');
  }
});

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture de fichier impossible'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsText(file);
  });
}

function getParams() {
  return {
    numClasses: Number(document.getElementById('numClasses').value),
    maxPerClass: Number(document.getElementById('maxPerClass').value),
    maxIterations: Number(document.getElementById('maxIterations').value),
    maxClassSizeWeight: Number(document.getElementById('maxClassSizeWeight').value),
    behaviorBalanceWeight: Number(document.getElementById('behaviorBalanceWeight').value),
    repartitionBalanceWeight: Number(document.getElementById('repartitionBalanceWeight').value),
    appariementWeight: Number(document.getElementById('appariementWeight').value),
    classSizeBalanceWeight: Number(document.getElementById('classSizeBalanceWeight').value),
    defaultAvecWeight: Number(document.getElementById('defaultAvecWeight').value),
    defaultSansWeight: Number(document.getElementById('defaultSansWeight').value),
    isolationPenaltyWeight: Number(document.getElementById('isolationPenaltyWeight').value),
    groupCompleteBonusWeight: Number(document.getElementById('groupCompleteBonusWeight').value),
    numProposals: Number(document.getElementById('numProposals').value),
    numAttempts: Number(document.getElementById('numAttempts').value),
  };
}

function tableHtmlFromParsed(parsed, compact = false) {
  if (parsed.headers.length === 0) {
    return 'CSV vide.';
  }
  const head = `<tr>${parsed.headers.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  let shownRows = parsed.rows;
  if (compact && parsed.rows.length >= 5) {
    shownRows = [
      parsed.rows[0],
      parsed.rows[1],
      null,
      parsed.rows[parsed.rows.length - 2],
      parsed.rows[parsed.rows.length - 1],
    ];
  }

  const body = shownRows.map((row) => {
    if (row === null) {
      return `<tr class="ellipsis-row"><td colspan="${parsed.headers.length}">⋮</td></tr>`;
    }
    return `<tr>${row.map((v) => `<td>${v}</td>`).join('')}</tr>`;
  }).join('');

  return `<table><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

const studentsExampleCsv = `
id;comp;avec;sans;rep1;rep2;app1;app2
Alice;-1;Charlie;;;;x;
Bob;1;;Frank;;;;x
Charlie;2;Alice;;;;x;
David;;;;;;;
Eve;1;;;x;;;
Frank;;;Bob;x;;;
Gaston;-1;;;;;x;
Hélène;;;;;;;x
E9;;;;;;;
`;

const groupsExampleCsv = `
groupe;poids
Bob|Gaston|Hélène|E9;5
Eve|Frank|Gaston;3
`;

function renderCsvTable(targetEl, csvText, maxRows, compact) {
  const parsed = parseCsvText(csvText, maxRows);
  targetEl.innerHTML = tableHtmlFromParsed(parsed, compact);
}

function renderPreview(targetEl, csvText) {
  renderCsvTable(targetEl, csvText, 8, true);
}

renderCsvTable(
  document.getElementById('studentsExamplePreview'),
  studentsExampleCsv,
  Number.MAX_SAFE_INTEGER,
  false,
);
renderCsvTable(
  document.getElementById('groupsExamplePreview'),
  groupsExampleCsv,
  Number.MAX_SAFE_INTEGER,
  false,
);

function showFullCsvModal(title, csvText) {
  csvModalTitle.textContent = title;
  renderCsvTable(csvModalContent, csvText, Number.MAX_SAFE_INTEGER, false);
  csvModal.showModal();
}

async function loadAndPreviewStudents(file) {
  lastStudentsCsvText = await readFileText(file);
  studentsFileName.textContent = file.name;
  renderPreview(studentsPreview, lastStudentsCsvText);
  showStudentsFullBtn.disabled = false;
}

async function loadAndPreviewGroups(file) {
  lastGroupsCsvText = await readFileText(file);
  groupsFileName.textContent = file.name;
  renderPreview(groupsPreview, lastGroupsCsvText);
  showGroupsFullBtn.disabled = false;
}

function classLabel(classIndex) {
  let number = classIndex + 1;
  let label = '';

  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }

  return label;
}

function renderResult(result) {
  resultBlocks.innerHTML = '';
  const wrapper = document.createElement('div');
  wrapper.className = 'proposal';

  const diagList = document.createElement('div');
  diagList.className = 'diag-grid';

  function formatImpact(value) {
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
  }

  function formatViolationLabel(violation) {
    if (violation.type === 'max') {
      return `max classe ${escapeHtml(violation.value)}`;
    }
    if (violation.type === 'classes') {
      return 'classes équilibrées';
    }
    if (violation.value === undefined) {
      return escapeHtml(violation.type);
    }
    return `${escapeHtml(violation.type)} "${escapeHtml(violation.value)}"`;
  }

  result.proposals.forEach((proposal, idx) => {
    const diag = document.createElement('div');
    diag.className = 'diag-col';

    if (proposal.score === null) {
      diag.innerHTML = `<strong>Proposition ${idx + 1}</strong><br>Vide`;
    } else {
      const violationList = proposal.violations.length > 0
        ? `<ul class="violation-list">${proposal.violations
          .map((violation) => `<li>${formatViolationLabel(violation)} (${formatImpact(violation.scoreImpact)})</li>`)
          .join('')}</ul>`
        : '';
      diag.innerHTML = `<strong>Proposition ${idx + 1}</strong><br>Score: ${proposal.score.toFixed(2)}<br>Contraintes violées: ${proposal.violationCount}${violationList}`;
    }

    diagList.appendChild(diag);
  });

  wrapper.appendChild(diagList);

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  thead.innerHTML = '<tr><th>id</th><th>Proposition 1</th><th>Proposition 2</th><th>Proposition 3</th></tr>';
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  result.students.forEach((id, studentIdx) => {
    const tr = document.createElement('tr');
    const cols = [id];
    for (let p = 0; p < 3; p += 1) {
      const proposal = result.proposals[p];
      if (!proposal || proposal.score === null || proposal.assignment[studentIdx] === null) {
        cols.push('');
      } else {
          cols.push(classLabel(proposal.assignment[studentIdx]));
      }
    }
    tr.innerHTML = `<td>${cols.map((value) => escapeHtml(value)).join('</td><td>')}</td>`;
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  wrapper.appendChild(table);
  resultBlocks.appendChild(wrapper);
}

function buildResultText(result, separator) {
  const headers = ['id', 'proposition_1', 'proposition_2', 'proposition_3'];
  const rows = [headers.join(separator)];

  for (let i = 0; i < result.students.length; i += 1) {
    const row = [result.students[i]];
    for (let p = 0; p < 3; p += 1) {
      const proposal = result.proposals[p];
      if (!proposal || proposal.score === null || proposal.assignment[i] === null) {
        row.push('');
      } else {
          row.push(classLabel(proposal.assignment[i]));
      }
    }
    rows.push(row.join(separator));
  }

  return rows.join('\n');
}

function buildExportCsv(result) {
  return buildResultText(result, ';');
}

function buildClipboardText(result) {
  return buildResultText(result, '\t');
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  if (!copied) {
    throw new Error('Copie dans le presse-papiers impossible');
  }
}

runBtn.addEventListener('click', async () => {
  errorBox.textContent = '';
  exportBtn.disabled = true;
  copyBtn.disabled = true;
  copyStatus.textContent = '';
  lastResult = null;

  try {
    const studentsFile = studentsFileInput.files?.[0];
    const groupsFile = groupsFileInput.files?.[0];

    if (!studentsFile || !groupsFile) {
      throw new Error('Importer les deux CSV avant de lancer.');
    }

    if (!lastStudentsCsvText || studentsFile.name !== studentsFileName.textContent) {
      await loadAndPreviewStudents(studentsFile);
    }
    if (!lastGroupsCsvText || groupsFile.name !== groupsFileName.textContent) {
      await loadAndPreviewGroups(groupsFile);
    }

    const studentsText = lastStudentsCsvText;
    const groupsText = lastGroupsCsvText;

    const result = classifyFromCsvTexts(studentsText, groupsText, getParams());
    lastResult = result;
    renderResult(result);
    exportBtn.disabled = false;
    copyBtn.disabled = false;
  } catch (error) {
    if (error && error.details) {
      const d = error.details;
      errorBox.textContent = `${d.file} ligne ${d.line} colonne ${d.column} [${d.code}] ${d.message} (champ: ${d.field}, valeur: ${d.value})`;
    } else {
      errorBox.textContent = error.message || String(error);
    }
  }
});

pickStudentsBtn.addEventListener('click', () => {
  studentsFileInput.click();
});

pickGroupsBtn.addEventListener('click', () => {
  groupsFileInput.click();
});

studentsFileInput.addEventListener('change', async () => {
  const file = studentsFileInput.files?.[0];
  if (!file) {
    return;
  }
  errorBox.textContent = '';
  try {
    await loadAndPreviewStudents(file);
  } catch (error) {
    errorBox.textContent = error.message || String(error);
  }
});

groupsFileInput.addEventListener('change', async () => {
  const file = groupsFileInput.files?.[0];
  if (!file) {
    return;
  }
  errorBox.textContent = '';
  try {
    await loadAndPreviewGroups(file);
  } catch (error) {
    errorBox.textContent = error.message || String(error);
  }
});

showStudentsFullBtn.addEventListener('click', () => {
  if (!lastStudentsCsvText) {
    return;
  }
  showFullCsvModal('CSV élèves complet', lastStudentsCsvText);
});

showGroupsFullBtn.addEventListener('click', () => {
  if (!lastGroupsCsvText) {
    return;
  }
  showFullCsvModal('CSV groupes complet', lastGroupsCsvText);
});

csvModalCloseBtn.addEventListener('click', () => {
  csvModal.close();
});

themeToggleBtn.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme);
  localStorage.setItem(themeStorageKey, nextTheme);
});

exportBtn.addEventListener('click', () => {
  if (!lastResult) {
    return;
  }
  const content = buildExportCsv(lastResult);
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'resultats_classes.csv';
  a.click();
  URL.revokeObjectURL(url);
});

copyBtn.addEventListener('click', async () => {
  if (!lastResult) {
    return;
  }
  copyStatus.textContent = '';
  try {
    await copyText(buildClipboardText(lastResult));
    copyStatus.textContent = 'Résultat copié.';
  } catch (error) {
    copyStatus.textContent = error.message || String(error);
  }
});
