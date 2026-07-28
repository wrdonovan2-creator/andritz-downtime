export interface Greeting { title: string; subtitle: string; }

// Chicago time; caller passes new Date() and lang.
export function getGreeting(now: Date, lang: "en" | "es"): Greeting {
  // Convert to Chicago local time before reading the hour.
  const chicago = new Date(now.toLocaleString("en-US", { timeZone: "America/Chicago" }));
  const h = chicago.getHours();
  // Windows:
  //  5-11  morning
  //  11-14 lunch
  //  14-20 afternoon
  //  20-5  evening / safe travels home
  if (h >= 5 && h < 11)
    return lang === "es"
      ? { title: "Buenos días equipo", subtitle: "¡Un buen día por delante!" }
      : { title: "Good Morning Team", subtitle: "Have a safe and productive shift" };
  if (h >= 11 && h < 14)
    return lang === "es"
      ? { title: "Buen provecho, equipo", subtitle: "Disfruta tu almuerzo" }
      : { title: "Enjoy Your Lunch", subtitle: "Rest, refuel, come back strong" };
  if (h >= 14 && h < 20)
    return lang === "es"
      ? { title: "Buenas tardes equipo", subtitle: "Terminemos el turno con seguridad" }
      : { title: "Good Afternoon Team", subtitle: "Finish the shift strong and safe" };
  return lang === "es"
    ? { title: "Buenas noches — Viaje seguro a casa", subtitle: "Gracias por tu turno" }
    : { title: "Good Night — Safe Travels Home", subtitle: "Thanks for your shift" };
}

// The "other language" greeting, used for the bilingual subtitle on the TV.
export function getGreetingOther(now: Date, lang: "en" | "es"): Greeting {
  return getGreeting(now, lang === "es" ? "en" : "es");
}
