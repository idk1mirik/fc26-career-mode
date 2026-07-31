export function generateFixtures(clubs: any[]) {

    const fixtures = [];
  
    for (let i = 0; i < clubs.length; i++) {
  
      for (let j = i + 1; j < clubs.length; j++) {
  
        fixtures.push({
          home: clubs[i],
          away: clubs[j],
        });
  
        fixtures.push({
          home: clubs[j],
          away: clubs[i],
        });
  
      }
  
    }
  
    return fixtures.sort(() => Math.random() - 0.5);
  
  }