// Points per correct answer scale with overall accuracy — full marks earns the
// most per question, lower scores earn progressively less.
export function pointsPerCorrectAnswer(percentCorrect) {
  if (percentCorrect >= 100) return 10;
  if (percentCorrect >= 80) return 7;
  if (percentCorrect >= 60) return 5;
  if (percentCorrect >= 40) return 3;
  return 1;
}
