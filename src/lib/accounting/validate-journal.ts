export function validateJournal(lines: {
  debit: number;
  credit: number;
}[]) {
  const totalDebit = lines.reduce((sum, l) => sum + Number(l.debit), 0);
  const totalCredit = lines.reduce((sum, l) => sum + Number(l.credit), 0);

  if (lines.length < 2) {
    throw new Error("Journal must have at least 2 lines");
  }

  if (totalDebit !== totalCredit) {
    throw new Error(
      `Unbalanced journal: debit ${totalDebit} != credit ${totalCredit}`
    );
  }

  return true;
}