export type BasicAssessment = {
  age: number;
  annualIncome: number;
  annualPremiumBudget: number;
  dependants: number;
  goal: "family" | "income" | "growth" | "child" | "review";
};

export function validateAssessment(input: BasicAssessment): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(input.age) || input.age < 18 || input.age > 100) errors.push("Age must be an integer from 18 to 100.");
  if (!Number.isFinite(input.annualIncome) || input.annualIncome < 0) errors.push("Annual income must be zero or more.");
  if (!Number.isFinite(input.annualPremiumBudget) || input.annualPremiumBudget < 0) errors.push("Annual premium budget must be zero or more.");
  if (!Number.isInteger(input.dependants) || input.dependants < 0 || input.dependants > 20) errors.push("Dependants must be an integer from 0 to 20.");
  return errors;
}

export function calculateBasicAssessment(input: BasicAssessment) {
  const errors = validateAssessment(input);
  if (errors.length) return { ok: false as const, errors };
  return {
    ok: true as const,
    annualBudgetShareOfIncome: input.annualIncome > 0
      ? Math.round((input.annualPremiumBudget / input.annualIncome) * 1000) / 10
      : null,
    flags: [
      ...(input.annualIncome === 0 && input.annualPremiumBudget > 0 ? ["Premium affordability cannot be assessed because income is zero or not supplied."] : []),
      ...(input.annualIncome > 0 && input.annualPremiumBudget / input.annualIncome > 0.15 ? ["The stated premium budget exceeds 15% of stated annual income. This is a discussion flag, not a suitability rule."] : []),
      ...(input.dependants > 0 ? ["Assess protection needs using dependants, liabilities, expenses, existing cover and goals before estimating a life-cover gap."] : []),
      "No premium, return, policy benefit or insurance recommendation is calculated by this basic assessment."
    ]
  };
}