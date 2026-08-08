import type { CalculatedField, RawRow } from "@/types/dashboard";
import type { ColumnProfile, DataSummary } from "@/types/data";
import { getNumericValue } from "./detect";

// Minimal safe arithmetic expression evaluator for calculated fields.
// Columns are referenced as [Column Name]; supports + - * / ( ) and numeric literals.

type Token = { type: "num" | "field" | "op" | "lparen" | "rparen"; value: string };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i++;
    } else if (ch === "[") {
      const end = expr.indexOf("]", i);
      if (end === -1) throw new Error("Unclosed [ in expression");
      tokens.push({ type: "field", value: expr.slice(i + 1, end) });
      i = end + 1;
    } else if (/[0-9.]/.test(ch)) {
      let j = i;
      while (j < expr.length && /[0-9.]/.test(expr[j])) j++;
      tokens.push({ type: "num", value: expr.slice(i, j) });
      i = j;
    } else if ("+-*/".includes(ch)) {
      tokens.push({ type: "op", value: ch });
      i++;
    } else if (ch === "(") {
      tokens.push({ type: "lparen", value: ch });
      i++;
    } else if (ch === ")") {
      tokens.push({ type: "rparen", value: ch });
      i++;
    } else {
      throw new Error(`Unexpected character "${ch}" — wrap column names in [brackets].`);
    }
  }
  return tokens;
}

const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };

// shunting-yard -> RPN, then evaluate against a row's field values
function toRPN(tokens: Token[]): Token[] {
  const output: Token[] = [];
  const ops: Token[] = [];
  for (const t of tokens) {
    if (t.type === "num" || t.type === "field") {
      output.push(t);
    } else if (t.type === "op") {
      while (ops.length && ops[ops.length - 1].type === "op" && PRECEDENCE[ops[ops.length - 1].value] >= PRECEDENCE[t.value]) {
        output.push(ops.pop()!);
      }
      ops.push(t);
    } else if (t.type === "lparen") {
      ops.push(t);
    } else if (t.type === "rparen") {
      while (ops.length && ops[ops.length - 1].type !== "lparen") output.push(ops.pop()!);
      ops.pop();
    }
  }
  while (ops.length) output.push(ops.pop()!);
  return output;
}

export function validateExpression(expression: string): string | null {
  try {
    tokenize(expression);
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : "Invalid expression";
  }
}

export function evaluateExpression(expression: string, row: RawRow): number | null {
  try {
    const rpn = toRPN(tokenize(expression));
    const stack: number[] = [];
    for (const t of rpn) {
      if (t.type === "num") stack.push(parseFloat(t.value));
      else if (t.type === "field") {
        const n = getNumericValue(row[t.value]);
        if (n === null) return null;
        stack.push(n);
      } else {
        const b = stack.pop() ?? 0;
        const a = stack.pop() ?? 0;
        switch (t.value) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(a * b);
            break;
          case "/":
            stack.push(b === 0 ? 0 : a / b);
            break;
        }
      }
    }
    return stack.pop() ?? null;
  } catch {
    return null;
  }
}

export function applyCalculatedFields(rows: RawRow[], fields: CalculatedField[]): RawRow[] {
  if (!fields.length) return rows;
  return rows.map((row) => {
    const next = { ...row };
    for (const f of fields) {
      next[f.name] = evaluateExpression(f.expression, row);
    }
    return next;
  });
}

export function extendSummaryWithCalculatedFields(summary: DataSummary, fields: CalculatedField[]): DataSummary {
  if (!fields.length) return summary;
  const newColumns: ColumnProfile[] = fields.map((f, i) => ({
    name: f.name,
    index: summary.columns.length + i,
    dataType: "number",
    role: "measure",
    isCurrency: false,
    isGeo: false,
    isTimeSeries: false,
    missingCount: 0,
    missingPct: 0,
    distinctCount: 0,
    duplicateValueCount: 0,
    sampleValues: [],
  }));
  return {
    ...summary,
    columns: [...summary.columns, ...newColumns],
    measures: [...summary.measures, ...fields.map((f) => f.name)],
  };
}
