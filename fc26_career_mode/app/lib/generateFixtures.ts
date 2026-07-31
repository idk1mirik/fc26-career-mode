export function generateFixtures(clubs: any[]) {
  if (clubs.length % 2 !== 0) {
    // Если нечетное количество, добавляем "выходной" (Бай)
    clubs = [...clubs, { id: "BYE", name: "休息" }];
  }

  const numClubs = clubs.length;
  const rounds = numClubs - 1;
  const matchesPerRound = numClubs / 2;
  
  const firstHalf: any[] = [];
  const secondHalf: any[] = [];

  // Копируем массив, чтобы не мутировать исходный
  const list = [...clubs];

  for (let round = 0; round < rounds; round++) {
    for (let match = 0; match < matchesPerRound; match++) {
      const home = list[match];
      const away = list[numClubs - 1 - match];

      // Пропускаем матчи с фантомным клубом
      if (home.id !== "BYE" && away.id !== "BYE") {
        // Первый круг
        firstHalf.push({ round: round + 1, home, away });
        // Второй круг (меняем полями)
        secondHalf.push({ round: round + 1 + rounds, home: away, away: home });
      }
    }
    // Ротация массива (первый элемент на месте, остальные двигаются по кругу)
    list.splice(1, 0, list.pop()!);
  }

  // Возвращаем полный календарь, отсортированный по турам
  return [...firstHalf, ...secondHalf];
}