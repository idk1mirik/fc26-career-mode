import { generateFixtures } from "./generateFixtures";

export function createSeason(league: any) {

  const fixtures = generateFixtures(league.clubs);

  return {

    currentDate: "2025-06-01",

    currentMatchday: 1,

    fixtures,

  };

}