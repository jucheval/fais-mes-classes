import { parseCsvText } from './csv.js';

function parseCsv(text, fileName) {
  const parsed = parseCsvText(text);
  if (parsed.headers.length === 0) {
    throw csvError(fileName, 1, 1, '', 'empty_file', 'Fichier CSV vide', '');
  }

  const { headers, separator } = parsed;
  const seenHeaders = new Set();
  headers.forEach((header, index) => {
    if (seenHeaders.has(header)) {
      throw csvError(fileName, 1, index + 1, header, 'duplicate_column', `Colonne dupliquée: ${header}`, header);
    }
    seenHeaders.add(header);
  });

  const rows = parsed.rows.map((values, rowIndex) => {
    if (values.length !== headers.length) {
      throw csvError(
        fileName,
        rowIndex + 2,
        values.length > headers.length ? headers.length + 1 : values.length + 1,
        '',
        'invalid_column_count',
        `Nombre de colonnes invalide: attendu ${headers.length}, reçu ${values.length}`,
        values.join(separator),
      );
    }
    return values;
  });

  return { headers, rows, separator };
}

function csvError(file, line, column, field, code, message, value) {
  const err = new Error(`[${code}] ${message}`);
  err.details = { file, line, column, field, code, message, value };
  return err;
}

function listFromCell(cell) {
  // Transform group cells into IDs list
  if (!cell || cell.trim() === '') {
    return [];
  }
  return cell.split('|').map((item) => item.trim());
}

function parseOptionalNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return null;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

function parsePositiveWeight(raw, file, line, column, field, required = false) {
  const rawValue = raw === undefined || raw === null ? '' : String(raw).trim();
  if (rawValue === '') {
    if (required) {
      throw csvError(file, line, column, field, 'missing_weight', `${field} est obligatoire`, rawValue);
    }
    return null;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) {
    throw csvError(file, line, column, field, 'invalid_weight', `${field} doit être un nombre`, rawValue);
  }
  if (value <= 0) {
    throw csvError(
      file,
      line,
      column,
      field,
      'invalid_weight_sign',
      `${field} doit être strictement positif`,
      rawValue,
    );
  }
  return value;
}

function checkRequiredCol(required, indexByHeader, filename) {
  for (const req of required) {
    if (!(req in indexByHeader)) {
      throw csvError(filename, 1, 1, req, 'missing_column', `Colonne requise manquante: ${req}`, '');
    }
  }
}

function checkExpectedCol(expected, expectedWithNumber, headers, filename) {
  outer: for (let i = 0; i < headers.length; i += 1) {
    const h = headers[i];
    if (expected.has(h)) {
      continue;
    }
    for (const prefix of expectedWithNumber) {
      if (h.startsWith(prefix)) {
        const suffix = h.slice(prefix.length);
        if (/^\d+$/.test(suffix)) {
          continue outer;
        }
      }
    }
    throw csvError(filename, 1, i + 1, h, 'unknown_column', `Colonne inconnue: ${h}`, h);
  }
}

function validateStudentsCsv(parsed) {
  const expectedCols = new Set(['id', 'comp', 'avec', 'sans', 'poids_avec', 'poids_sans']);
  const expectedNumberCols = new Set(['rep', 'app']);
  const requiredCols = ['id', 'comp', 'avec', 'sans'];
  const headers = parsed.headers;
  const indexByHeader = {};

  headers.forEach((h, idx) => {
    indexByHeader[h] = idx;
  });

  checkRequiredCol(requiredCols, indexByHeader, 'eleves.csv');

  checkExpectedCol(expectedCols, expectedNumberCols, headers, 'eleves.csv');

  const repCols = headers.filter((h) => /^rep\d+$/.test(h));
  const appCols = headers.filter((h) => /^app\d+$/.test(h));

  const ids = new Set();
  const students = [];

  for (let r = 0; r < parsed.rows.length; r += 1) {
    const row = parsed.rows[r];
    const line = r + 2;
    const id = (row[indexByHeader.id] || '').trim();
    if (!id) {
      throw csvError('eleves.csv', line, indexByHeader.id + 1, 'id', 'missing_id', 'id vide', '');
    }
    if (ids.has(id)) {
      throw csvError('eleves.csv', line, indexByHeader.id + 1, 'id', 'duplicate_id', `id dupliqué: ${id}`, id);
    }
    ids.add(id);

    const compRaw = (row[indexByHeader.comp] || '').trim();
    const comp = compRaw === '' ? 0 : Number(compRaw);
    if (!Number.isInteger(comp) || comp < -2 || comp > 2) {
      throw csvError('eleves.csv', line, indexByHeader.comp + 1, 'comp', 'invalid_integer_range', 'comp doit être un entier entre -2 et +2', compRaw);
    }

    const avec = listFromCell(row[indexByHeader.avec] || '');
    const sans = listFromCell(row[indexByHeader.sans] || '');

    if (avec.some((v) => v === '')) {
      throw csvError('eleves.csv', line, indexByHeader.avec + 1, 'avec', 'empty_group_member', 'avec contient un id vide', row[indexByHeader.avec] || '');
    }
    if (sans.some((v) => v === '')) {
      throw csvError('eleves.csv', line, indexByHeader.sans + 1, 'sans', 'empty_group_member', 'sans contient un id vide', row[indexByHeader.sans] || '');
    }

    const repFlags = {};
    for (const col of repCols) {
      repFlags[col] = String(row[indexByHeader[col]] || '').trim() !== '';
    }

    const appFlags = {};
    for (const col of appCols) {
      appFlags[col] = String(row[indexByHeader[col]] || '').trim() !== '';
    }

    const poidsAvec = parsePositiveWeight(
      row[indexByHeader.poids_avec],
      'eleves.csv',
      line,
      (indexByHeader.poids_avec ?? 0) + 1,
      'poids_avec',
    );
    const poidsSans = parsePositiveWeight(
      row[indexByHeader.poids_sans],
      'eleves.csv',
      line,
      (indexByHeader.poids_sans ?? 0) + 1,
      'poids_sans',
    );

    students.push({
      id,
      comp,
      avec,
      sans,
      poidsAvec,
      poidsSans,
      repFlags,
      appFlags,
    });
  }

  for (const s of students) {
    for (const other of s.avec) {
      if (!ids.has(other)) {
        throw csvError('eleves.csv', 0, 0, 'avec', 'unknown_student_id', `avec contient un id inconnu: ${other}`, other);
      }
    }
    for (const other of s.sans) {
      if (!ids.has(other)) {
        throw csvError('eleves.csv', 0, 0, 'sans', 'unknown_student_id', `sans contient un id inconnu: ${other}`, other);
      }
    }
  }

  return { students, idSet: ids, repCols, appCols };
}

function validateGroupsCsv(parsed, idSet) {
  const requiredCols = new Set(['groupe', 'poids']);
  const expectedCols = new Set(['groupe', 'poids']);
  const headers = parsed.headers;
  const indexByHeader = {};

  headers.forEach((h, idx) => {
    indexByHeader[h] = idx;
  });

  checkRequiredCol(requiredCols, indexByHeader, 'groupes.csv');

  checkExpectedCol(expectedCols, [], headers, 'groupes.csv');

  const groups = [];
  for (let r = 0; r < parsed.rows.length; r += 1) {
    const row = parsed.rows[r];
    const line = r + 2;

    const ids = listFromCell(row[indexByHeader.groupe] || '');
    if (ids.length === 0) {
      throw csvError('groupes.csv', line, indexByHeader.groupe + 1, 'groupe', 'empty_group', 'groupe vide', row[indexByHeader.groupe] || '');
    }
    if (ids.some((v) => v === '')) {
      throw csvError('groupes.csv', line, indexByHeader.groupe + 1, 'groupe', 'empty_group_member', 'groupe contient un id vide', row[indexByHeader.groupe] || '');
    }
    for (const id of ids) {
      if (!idSet.has(id)) {
        throw csvError('groupes.csv', line, indexByHeader.groupe + 1, 'groupe', 'unknown_student_id', `groupe contient un id inconnu: ${id}`, id);
      }
    }

    const poids = parsePositiveWeight(
      row[indexByHeader.poids],
      'groupes.csv',
      line,
      indexByHeader.poids + 1,
      'poids',
      true,
    );

    groups.push({ ids, poids });
  }

  return groups;
}

// Source - https://stackoverflow.com/a/47593316
// Posted by bryc, modified by community. See post 'Timeline' for change history
// Retrieved 2026-08-01, License - CC BY-SA 4.0
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function shuffle(array, rand) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = array[i];
    array[i] = array[j];
    array[j] = tmp;
  }
}

function buildAppComponents(students, appCols) {
  const parent = students.map((_, studentIndex) => studentIndex);

  function findRoot(studentIndex) {
    let rootIndex = studentIndex;
    while (parent[rootIndex] !== rootIndex) {
      rootIndex = parent[rootIndex];
    }
    while (parent[studentIndex] !== studentIndex) {
      const nextIndex = parent[studentIndex];
      parent[studentIndex] = rootIndex;
      studentIndex = nextIndex;
    }
    return rootIndex;
  }

  function join(firstIndex, secondIndex) {
    const firstRoot = findRoot(firstIndex);
    const secondRoot = findRoot(secondIndex);
    if (firstRoot !== secondRoot) {
      parent[secondRoot] = firstRoot;
    }
  }

  for (const app of appCols) {
    const members = students
      .map((student, studentIndex) => (student.appFlags[app] ? studentIndex : -1))
      .filter((studentIndex) => studentIndex >= 0);
    for (let memberIndex = 1; memberIndex < members.length; memberIndex += 1) {
      join(members[0], members[memberIndex]);
    }
  }

  const componentsByRoot = new Map();
  students.forEach((_, studentIndex) => {
    const rootIndex = findRoot(studentIndex);
    if (!componentsByRoot.has(rootIndex)) {
      componentsByRoot.set(rootIndex, []);
    }
    componentsByRoot.get(rootIndex).push(studentIndex);
  });
  return Array.from(componentsByRoot.values());
}

function buildOptimizationUnits(appComponents, maxPerClass) {
  const units = [];
  for (const component of appComponents) {
    if (component.length <= maxPerClass) {
      units.push(component);
      continue;
    }
    for (const studentIndex of component) {
      units.push([studentIndex]);
    }
  }
  return units;
}

function initialAssignment(data, numClasses, maxPerClass, rand) {
  const components = buildOptimizationUnits(data.appComponents, maxPerClass)
    .map((component) => component.slice());
  shuffle(components, rand);
  components.sort((firstComponent, secondComponent) => secondComponent.length - firstComponent.length);
  const loads = Array(numClasses).fill(0);
  const assignment = Array(data.students.length).fill(0);

  for (const component of components) {
    const availableClasses = [];
    for (let classIndex = 0; classIndex < numClasses; classIndex += 1) {
      if (loads[classIndex] + component.length <= maxPerClass) {
        availableClasses.push(classIndex);
      }
    }
    const candidateClasses = availableClasses.length > 0
      ? availableClasses
      : Array.from({ length: numClasses }, (_, classIndex) => classIndex);
    const minimumLoad = Math.min(...candidateClasses.map((classIndex) => loads[classIndex]));
    const leastLoadedClasses = candidateClasses.filter((classIndex) => loads[classIndex] === minimumLoad);
    const assignedClass = leastLoadedClasses[Math.floor(rand() * leastLoadedClasses.length)];

    for (const studentIndex of component) {
      assignment[studentIndex] = assignedClass;
    }
    loads[assignedClass] += component.length;
  }

  return assignment;
}

function evaluateAssignment(assignment, data, params) {
  const { students, repCols, appCols, groups, indexById } = data;
  const {
    numClasses,
    maxPerClass,
    maxClassSizeWeight,
    behaviorBalanceWeight,
    repartitionBalanceWeight,
    appariementWeight,
    classSizeBalanceWeight,
    defaultAvecWeight,
    defaultSansWeight,
    isolationPenaltyWeight,
    groupCompleteBonusWeight,
  } = params;

  const classSizes = Array(numClasses).fill(0);
  const classComp = Array(numClasses).fill(0);

  for (let i = 0; i < students.length; i += 1) {
    const c = assignment[i];
    classSizes[c] += 1;
    classComp[c] += students[i].comp;
  }

  let penalty = 0;
  let bonus = 0;
  const violations = [];

  function addViolation(type, amount, value) {
    if (amount <= 0) {
      return null;
    }
    const violation = { type, scoreImpact: -amount };
    if (value !== undefined) {
      violation.value = value;
    }
    violations.push(violation);
    return violation;
  }

  // Maximum class size
  for (let c = 0; c < numClasses; c += 1) {
    if (classSizes[c] > maxPerClass) {
      const amount = (classSizes[c] - maxPerClass) * maxClassSizeWeight;
      penalty += amount;
      addViolation('max', amount, c + 1);
    }
  }

  // Behavior balance
  const targetComp = classComp.reduce((a, b) => a + b, 0) / numClasses;
  let behaviorPenalty = 0;
  let behaviorViolated = false;
  for (let c = 0; c < numClasses; c += 1) {
    const gap = Math.abs(classComp[c] - targetComp);
    const amount = gap * behaviorBalanceWeight;
    penalty += amount;
    behaviorPenalty += amount;
    if (gap > 0.5) {
      behaviorViolated = true;
    }
  }
  if (behaviorViolated) {
    addViolation('comp', behaviorPenalty);
  }

  // Repartition balance
  for (const rep of repCols) {
    const inRep = students.map((s, idx) => (s.repFlags[rep] ? idx : -1)).filter((x) => x >= 0);
    if (inRep.length === 0) {
      continue;
    }
    const counts = Array(numClasses).fill(0);
    for (const idx of inRep) {
      counts[assignment[idx]] += 1;
    }
    const minmaxCountsDiff = Math.max.apply(Math, counts) - Math.min.apply(Math, counts);
    const amount = minmaxCountsDiff * repartitionBalanceWeight;
    penalty += amount;
    if (minmaxCountsDiff > 0) {
      addViolation(rep, amount);
    }
  }

  // Appariement
  for (const app of appCols) {
    const members = students.map((s, idx) => (s.appFlags[app] ? idx : -1)).filter((x) => x >= 0);
    if (members.length <= 1) {
      continue;
    }
    const usedClasses = new Set(members.map((idx) => assignment[idx]));
    if (usedClasses.size > 1) {
      const amount = (usedClasses.size - 1) * appariementWeight;
      penalty += amount;
      const violation = addViolation(app, amount);
      if (violation) {
        violation.students = members.map((idx) => students[idx].id);
      }
    }
  }

  // Class size balance
  const targetSize = students.length / numClasses;
  let classSizeBalancePenalty = 0;
  let classSizeBalanceViolated = false;
  for (let c = 0; c < numClasses; c += 1) {
    const gap = Math.abs(classSizes[c] - targetSize);
    const amount = gap * classSizeBalanceWeight;
    penalty += amount;
    classSizeBalancePenalty += amount;
    if (gap > 0.5) {
      classSizeBalanceViolated = true;
    }
  }
  if (classSizeBalanceViolated) {
    addViolation('classes', classSizeBalancePenalty);
  }

  // Avec/sans
  for (let i = 0; i < students.length; i += 1) {
    const s = students[i];
    const c = assignment[i];

    if (s.avec.length > 0) {
      const hasFriend = s.avec.some((id) => assignment[indexById[id]] === c);
      if (!hasFriend) {
        const w = s.poidsAvec ?? defaultAvecWeight;
        penalty += w;
        addViolation('avec', w, s.id);
      }
    }

    if (s.sans.length > 0) {
      const conflicts = s.sans.filter((id) => assignment[indexById[id]] === c).length;
      if (conflicts > 0) {
        const w = s.poidsSans ?? defaultSansWeight;
          const amount = w * conflicts;
          penalty += amount;
          addViolation('sans', amount, s.id);
      }
    }
  }

    // Group isolation + complete-group bonus
  for (const g of groups) {
    let classRef = assignment[indexById[g.ids[0]]];
    let allSame = true;
      let groupPenalty = 0;

    for (const id of g.ids) {
      const idx = indexById[id];
      if (assignment[idx] !== classRef) {
        allSame = false;
      }

      let sameClassCount = 0;
      for (const other of g.ids) {
        if (other === id) {
          continue;
        }
        if (assignment[indexById[other]] === assignment[idx]) {
          sameClassCount += 1;
        }
      }

      if (sameClassCount === 0) {
        groupPenalty += isolationPenaltyWeight * g.poids;
      }
    }

    penalty += groupPenalty;
    addViolation('groupe', groupPenalty, g.ids.join('|'));

    if (allSame) {
      bonus += groupCompleteBonusWeight * g.poids;
    }
  }

  const score = bonus - penalty;

  return {
    score,
    penalty,
    bonus,
    violationCount: violations.length,
    violations,
  };
}

function optimize(data, params, seed) {
  const rand = mulberry32(seed);
  const assignment = initialAssignment(data, params.numClasses, params.maxPerClass, rand);
  const optimizationUnits = buildOptimizationUnits(data.appComponents, params.maxPerClass);
  let bestAssignment = assignment.slice();
  let bestEval = evaluateAssignment(bestAssignment, data, params);

  for (let iter = 0; iter < params.maxIterations; iter += 1) {
    const next = bestAssignment.slice();
    const firstComponentIndex = Math.floor(rand() * optimizationUnits.length);
    const secondComponentIndex = Math.floor(rand() * optimizationUnits.length);

    if (firstComponentIndex === secondComponentIndex) {
      continue;
    }

    const firstComponent = optimizationUnits[firstComponentIndex];
    const secondComponent = optimizationUnits[secondComponentIndex];
    const firstClass = next[firstComponent[0]];
    const secondClass = next[secondComponent[0]];
    for (const studentIndex of firstComponent) {
      next[studentIndex] = secondClass;
    }
    for (const studentIndex of secondComponent) {
      next[studentIndex] = firstClass;
    }

    const nextEval = evaluateAssignment(next, data, params);
    if (nextEval.score >= bestEval.score) {
      bestAssignment = next;
      bestEval = nextEval;
    }
  }

  return { assignment: bestAssignment, ...bestEval };
}

function uniqueSignature(assignment) {
  return assignment.join(',');
}

function buildData(students, groups, repCols, appCols) {
  const indexById = {};
  students.forEach((s, idx) => {
    indexById[s.id] = idx;
  });
  const appComponents = buildAppComponents(students, appCols);
  return { students, groups, repCols, appCols, indexById, appComponents };
}

function normalizeParams(input = {}) {
  return {
    numClasses: Math.max(1, Number(input.numClasses ?? 4)),
    maxPerClass: Math.max(1, Number(input.maxPerClass ?? 30)),
    maxIterations: Math.max(1, Number(input.maxIterations ?? 1000)),
    maxClassSizeWeight: Number(input.maxClassSizeWeight ?? 50),
    behaviorBalanceWeight: Number(input.behaviorBalanceWeight ?? 10),
    repartitionBalanceWeight: Number(input.repartitionBalanceWeight ?? 20),
    appariementWeight: Number(input.appariementWeight ?? 50),
    classSizeBalanceWeight: Number(input.classSizeBalanceWeight ?? 2),
    defaultAvecWeight: Number(input.defaultAvecWeight ?? 3),
    defaultSansWeight: Number(input.defaultSansWeight ?? 3),
    isolationPenaltyWeight: Number(input.isolationPenaltyWeight ?? 2),
    groupCompleteBonusWeight: Number(input.groupCompleteBonusWeight ?? 1),
    numProposals: Math.min(5, Math.max(1, Number(input.numProposals ?? 3))),
    numAttempts: Math.max(10, Number(input.numAttempts ?? 50)),
  };
}

export function classifyFromCsvTexts(studentsCsvText, groupsCsvText, userParams) {
  const studentsParsed = parseCsv(studentsCsvText, 'eleves.csv');
  const groupsParsed = parseCsv(groupsCsvText, 'groupes.csv');

  const studentsResult = validateStudentsCsv(studentsParsed);
  const groups = validateGroupsCsv(groupsParsed, studentsResult.idSet);

  const data = buildData(studentsResult.students, groups, studentsResult.repCols, studentsResult.appCols);
  const params = normalizeParams(userParams);

  const attempts = params.numAttempts;
  const seen = new Set();
  const candidates = [];

  for (let k = 0; k < attempts; k += 1) {
    const proposal = optimize(data, params, k + 1);
    const sig = uniqueSignature(proposal.assignment);
    if (!seen.has(sig)) {
      seen.add(sig);
      candidates.push(proposal);
    }
  }

  candidates.sort((a, b) => b.score - a.score);
  const selected = candidates.slice(0, params.numProposals);

  while (selected.length < 3) {
    selected.push({
      assignment: Array(data.students.length).fill(null),
      score: null,
      violationCount: null,
      violations: [],
      penalty: null,
      bonus: null,
    });
  }

  return {
    students: data.students.map((s) => s.id),
    proposals: selected,
    params,
  };
}
