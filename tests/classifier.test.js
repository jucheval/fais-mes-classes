import test from 'node:test';
import assert from 'node:assert/strict';

import { classifyFromCsvTexts } from '../src/classifier.js';

const studentsCsv = `id;rep1;app1;comp;avec;poids_avec;sans;poids_sans
A;x;x;1;B;;;
B;x;x;0;A;;;
C;;;-1;;;A;
D;;;;;;;
`;

const groupsCsv = `groupe;poids
A|B;2
C|D;1
`;

test('classify returns up to 3 proposals with diagnostics', () => {
  const result = classifyFromCsvTexts(studentsCsv, groupsCsv, {
    numClasses: 2,
    maxPerClass: 3,
    maxIterations: 150,
    maxClassSizeWeight: 50,
    behaviorBalanceWeight: 10,
    repartitionBalanceWeight: 20,
    appariementWeight: 50,
    classSizeBalanceWeight: 2,
    defaultAvecWeight: 3,
    defaultSansWeight: 3,
    isolationPenaltyWeight: 2,
    groupCompleteBonusWeight: 1,
    numProposals: 3,
  });

  assert.equal(result.students.length, 4);
  assert.equal(result.proposals.length, 3);
  assert.equal(result.proposals[0].assignment.length, 4);
  assert.ok(typeof result.proposals[0].score === 'number');
  assert.ok(typeof result.proposals[0].violationCount === 'number');
});

test('validator rejects unknown ids in avec/sans/groups', () => {
  const badStudents = `id;rep1;comp;avec;sans\nA;x;0;X;\n`;
  const badGroups = `groupe;poids\nA|Y;2\n`;

  assert.throws(() => {
    classifyFromCsvTexts(badStudents, badGroups, {
      numClasses: 2,
      maxPerClass: 2,
      maxIterations: 10,
      maxClassSizeWeight: 50,
      behaviorBalanceWeight: 10,
      repartitionBalanceWeight: 20,
      appariementWeight: 50,
      classSizeBalanceWeight: 2,
      defaultAvecWeight: 2,
      defaultSansWeight: 2,
      isolationPenaltyWeight: 2,
      groupCompleteBonusWeight: 1,
      numProposals: 3,
    });
  }, /unknown_student_id/);
});

test('validator rejects non-positive optional weights', () => {
  const badStudents = `id;rep1;comp;avec;poids_avec;sans;poids_sans\nA;x;0;B;-1;;\nB;x;0;;;A;0\n`;
  const groups = `groupe;poids\nA|B;1\n`;

  assert.throws(() => {
    classifyFromCsvTexts(badStudents, groups, {
      numClasses: 2,
      maxPerClass: 2,
      maxIterations: 10,
      maxClassSizeWeight: 50,
      behaviorBalanceWeight: 10,
      repartitionBalanceWeight: 20,
      appariementWeight: 50,
      classSizeBalanceWeight: 2,
      defaultAvecWeight: 2,
      defaultSansWeight: 2,
      isolationPenaltyWeight: 2,
      groupCompleteBonusWeight: 1,
      numProposals: 3,
    });
  }, /invalid_weight_sign/);
});

test('validator rejects missing or invalid group weights', () => {
  const students = `id;comp;avec;sans\nA;0;;\nB;0;;\n`;

  for (const groups of [
    `groupe;poids\nA|B;\n`,
    `groupe;poids\nA|B;abc\n`,
  ]) {
    assert.throws(() => {
      classifyFromCsvTexts(students, groups, { numClasses: 1, maxPerClass: 2, maxIterations: 1 });
    }, /weight|poids/i);
  }
});

test('validator rejects malformed row widths and duplicate headers', () => {
  const students = `id;comp;avec;sans\nA;0;;\nB;0;;\n`;

  assert.throws(() => {
    classifyFromCsvTexts(students, `groupe;poids\nA|B;1;extra\n`, { numClasses: 1, maxPerClass: 2, maxIterations: 1 });
  }, /column_count|colonne/i);

  assert.throws(() => {
    classifyFromCsvTexts(`id;comp;avec;sans;app1;app1\nA;0;;;\n`, `groupe;poids\nA;1\n`, { numClasses: 1, maxPerClass: 1, maxIterations: 1 });
  }, /duplicate_column|colonne/i);
});

test('optimizer keeps feasible app groups together', () => {
  const students = `id;app1;comp;avec;sans
A;x;0;;
B;x;0;;
C;x;0;;
 D;x;0;;
 E;x;0;;
 F;x;0;;
 G;x;0;;
 H;x;0;;
 I;;0;;
 J;;0;;
 K;;0;;
 L;;0;;
`;
  const groups = `groupe;poids
A|B;1
`;

  const result = classifyFromCsvTexts(students, groups, {
    numClasses: 2,
    maxPerClass: 12,
    maxIterations: 1,
    numProposals: 1,
  });

  assert.equal(result.proposals[0].violations.some((v) => v.type === 'app1'), false);
});

test('pipeline detects comma-separated CSV and preserves empty proposal columns', () => {
  const students = `id,comp,avec,sans\nA,, ,\nB,0,,\n`;
  const groups = `groupe,poids\nA|B,1\n`;
  const result = classifyFromCsvTexts(students, groups, {
    numClasses: 1,
    maxPerClass: 2,
    maxIterations: 1,
    numProposals: 1,
  });

  assert.deepEqual(result.students, ['A', 'B']);
  assert.equal(result.proposals.length, 3);
  assert.equal(result.proposals[1].score, null);
  assert.equal(result.proposals[2].score, null);
});

test('group-complete bonus contributes to the public score', () => {
  const students = `id;comp;avec;sans\nA;0;;\nB;0;;\n`;
  const groups = `groupe;poids\nA|B;2\n`;
  const params = { numClasses: 1, maxPerClass: 2, maxIterations: 1, numProposals: 1 };

  const withBonus = classifyFromCsvTexts(students, groups, {
    ...params,
    groupCompleteBonusWeight: 3,
  });
  const withoutBonus = classifyFromCsvTexts(students, groups, {
    ...params,
    groupCompleteBonusWeight: 0,
  });

  assert.equal(withBonus.proposals[0].score - withoutBonus.proposals[0].score, 6);
});

test('detailed violations are empty when no app* constraint is violated', () => {
  const s = `id;rep1;comp;avec;sans\nA;x;2;;\nB;;-2;;\n`;
  const g = `groupe;poids\nA|B;1\n`;
  const result = classifyFromCsvTexts(s, g, {
    numClasses: 1,
    maxPerClass: 1,
    maxIterations: 20,
    maxClassSizeWeight: 50,
    behaviorBalanceWeight: 10,
    repartitionBalanceWeight: 20,
    appariementWeight: 50,
    classSizeBalanceWeight: 1,
    defaultAvecWeight: 1,
    defaultSansWeight: 1,
    isolationPenaltyWeight: 1,
    groupCompleteBonusWeight: 1,
    numProposals: 1,
  });

  assert.equal(result.proposals[0].violations.some((v) => v.type === 'app1'), false);
});

test('detailed violations use app* column names', () => {
  const s = `id;app1;comp;avec;sans\nA;x;0;;\nB;x;0;;\nC;x;0;;\nD;x;0;;\nE;x;0;;\nF;x;0;;\nG;x;0;;\nH;x;0;;\nI;;0;;\nJ;;0;;\n`;
  const g = `groupe;poids\nA|B|C;1\n`;
  const result = classifyFromCsvTexts(s, g, {
    numClasses: 2,
    maxPerClass: 2,
    maxIterations: 10,
    maxClassSizeWeight: 50,
    behaviorBalanceWeight: 10,
    repartitionBalanceWeight: 20,
    appariementWeight: 50,
    classSizeBalanceWeight: 1,
    defaultAvecWeight: 1,
    defaultSansWeight: 1,
    isolationPenaltyWeight: 1,
    groupCompleteBonusWeight: 1,
    numProposals: 1,
  });

  const violations = result.proposals[0].violations;
  const appViolations = violations.filter((v) => v.type === 'app1');
  assert.ok(appViolations.length >= 1);
  assert.ok(appViolations.every((v) => v.students.length > 0));
});

test('violations include labels and negative score impacts', () => {
  const students = `id;rep1;comp;avec;sans
A;x;2;B;
B;;-2;;A
C;;;;
D;;;;
`;
  const groups = `groupe;poids
A|C;5
`;
  const result = classifyFromCsvTexts(students, groups, {
    numClasses: 2,
    maxPerClass: 2,
    maxIterations: 20,
    numProposals: 1,
  });

  const violations = result.proposals[0].violations;
  assert.ok(violations.some((v) => v.type === 'rep1'));
  assert.ok(violations.some((v) => v.type === 'sans' && v.value === 'B'));
  assert.ok(violations.some((v) => v.type === 'groupe' && v.value === 'A|C'));
  assert.ok(violations.every((v) => v.scoreImpact < 0));
  assert.equal(result.proposals[0].violationCount, violations.length);
});
