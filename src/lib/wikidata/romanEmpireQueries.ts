export const ROMAN_ENTITIES_QUERY = `
SELECT ?entity ?entityLabel ?description ?coord WHERE {
  VALUES ?entity {
    wd:Q2277     # Roman Empire
    wd:Q42834    # Western Roman Empire
    wd:Q12544    # Byzantine Empire
    wd:Q220      # Rome
    wd:Q16869    # Constantinople
    wd:Q6343     # Carthage
    wd:Q1048     # Julius Caesar
    wd:Q1405     # Augustus
    wd:Q8413     # Constantine the Great
    wd:Q130601   # Romulus Augustulus / Romulus Augustus
    wd:Q42193    # Goths
    wd:Q42211    # Vandals
    wd:Q45813    # Huns
  }

  OPTIONAL { ?entity schema:description ?description FILTER(LANG(?description) = "en") }
  OPTIONAL { ?entity wdt:P625 ?coord }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;

export const ROMAN_EVENTS_QUERY = `
SELECT ?event ?eventLabel ?description ?date ?coord WHERE {
  VALUES ?event {
    wd:Q160387    # Battle of Actium
    wd:Q329838    # Crisis of the Third Century
    wd:Q1463845   # Sack of Rome 410
    wd:Q1463832   # Sack of Rome 455
    wd:Q608613    # Fall of the Western Roman Empire
    wd:Q124988    # Punic Wars
    wd:Q6271      # Second Punic War
  }

  OPTIONAL { ?event schema:description ?description FILTER(LANG(?description) = "en") }
  OPTIONAL { ?event wdt:P585 ?date }
  OPTIONAL { ?event wdt:P625 ?coord }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;
