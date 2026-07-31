export function calculateTransferPrice(
    value: number,
    overall: number,
    age: number
  ) {
  
    let finalPrice = value;
  
    // SUPERSTARS
    if (overall >= 90) {
      finalPrice *= 2;
    }
  
    // WORLD CLASS
    else if (overall >= 85) {
      finalPrice *= 1.6;
    }
  
    // YOUNG TALENTS
    if (age <= 23) {
      finalPrice *= 1.4;
    }
  
    // OLD PLAYERS
    if (age >= 32) {
      finalPrice *= 0.7;
    }
  
    return Math.round(finalPrice);
  }