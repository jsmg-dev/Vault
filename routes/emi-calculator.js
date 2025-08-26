function calculateEMI(principal, annualRate, tenureMonths) {
  const monthlyRate = (annualRate / 12) / 100;  // annual % to monthly decimal
  const n = tenureMonths;

  if (monthlyRate === 0) {
    return principal / n; // if no interest
  }

  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
              (Math.pow(1 + monthlyRate, n) - 1);

  return emi.toFixed(2); // round to 2 decimal
}


   