const fs = require("fs");
const csv = require("csv-parser");

const leaguesMap = {};

fs.createReadStream("data/ea_fc26_players.csv")
  .pipe(csv())
  .on("data", (row) => {
    const leagueName = row.leagueName;
    const clubName = row.team;

    if (!leaguesMap[leagueName]) {
      leaguesMap[leagueName] = {
        id: leagueName,
        name: leagueName,
        clubs: []
      };
    }

    const league = leaguesMap[leagueName];

    if (!league.clubs.find(c => c.name === clubName)) {
      league.clubs.push({
        id: clubName,
        name: clubName
      });
    }
  })
  .on("end", () => {
    fs.writeFileSync(
      "frontend/data/leagues.json",
      JSON.stringify(Object.values(leaguesMap), null, 2)
    );

    console.log("✅ SAFE JSON CREATED");
  });
``