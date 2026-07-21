const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("curriculum and all appended question banks initialize without an exception", () => {
  const root = path.resolve(__dirname, "../..");
  const context = {window:{}, console};
  vm.createContext(context);
  const files = [
    "data/questions/question-bank-loader.js",
    "data/questions/math-extra-v2.js",
    "data/questions/olympiad-extra-v2.js",
    "data/questions/reading.js",
    "data/questions/english.js",
    "data/questions/physics.js",
    "data/questions/chemistry.js",
    "data/questions/biology.js",
    "data/questions/comprehensive-extra-v2.js",
    "data/questions/history-extra-v2.js",
    "data/questions/geography-extra-v2.js",
    "data/questions/idiom.js",
    "data/curriculum/math-curriculum.js",
    "data/curriculum/reading-curriculum.js",
    "data/curriculum/english-curriculum.js",
    "data/curriculum/science-curriculum.js",
    "data/curriculum-enhancements.js"
  ];
  for(const file of files) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, {filename:file});
  }

  const subjects = ["math","olympiad","reading","english","physics","chemistry","biology","comprehensive","history","geography","idiom"];
  const data = Object.fromEntries(subjects.map(subject => [subject, {questions:[], cards:[]}])) ;
  assert.doesNotThrow(() => context.window.applyCurriculumEnhancements(data));
  assert.doesNotThrow(() => context.window.XUEBA_QUESTION_BANK.append(data));
  assert.ok(context.window.XUEBA_CURRICULUM.COURSE_MAP.length > 100);
  for(const subject of subjects) assert.ok(data[subject].questions.length >= 100, `${subject} question count`);
});
