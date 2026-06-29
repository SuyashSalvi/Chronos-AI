export const ROMAN_ENTITIES_QUERY = `
SELECT ?entity ?entityLabel ?description ?coord WHERE {
  {
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

      # Provinces and regions
      wd:Q185103   # Roman Britain
      wd:Q879466   # Roman Gaul
      wd:Q186513   # Hispania
      wd:Q202311   # Roman Egypt
      wd:Q181238   # Africa (Roman province)
      wd:Q1003997  # Judaea (Roman province)
      wd:Q207497   # Macedonia (Roman province)
      wd:Q210718   # Asia (Roman province)

      # Important cities
      wd:Q87       # Alexandria
      wd:Q200441   # Antioch
      wd:Q13364    # Ravenna
      wd:Q729978   # Mediolanum
      wd:Q1524     # Athens
      wd:Q1218     # Jerusalem
      wd:Q47611    # Ephesus
      wd:Q3138     # Trier
      wd:Q665      # Lugdunum

      # Neighboring civilizations and peoples
      wd:Q1986139  # Parthian Empire
      wd:Q83891    # Sasanian Empire
      wd:Q273854   # Gauls
      wd:Q22633    # Germanic peoples
      wd:Q212853   # Dacians
      wd:Q93180    # Seleucid Empire

      # Dynasties and institutions/reforms
      wd:Q192841   # Julio-Claudian dynasty
      wd:Q200565   # Flavian dynasty
      wd:Q3202662  # Nerva-Antonine dynasty
      wd:Q321219   # Severan dynasty
      wd:Q175454   # Constantinian dynasty
      wd:Q174450   # Tetrarchy
    }
  }
  UNION
  {
    ?entity wdt:P39 wd:Q842606. # Roman emperor
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

    # Major battles
    wd:Q179591    # Battle of Cannae
    wd:Q200056    # Battle of Zama
    wd:Q131386    # Battle of Alesia
    wd:Q192473    # Battle of Adrianople
    wd:Q203681    # Battle of Pharsalus
    wd:Q335330    # Battle of Philippi
    wd:Q205887    # Battle of Carrhae
    wd:Q1165502   # Battle of Edessa

    # Wars and crises
    wd:Q677316    # Social War
    wd:Q1616064   # Mithridatic Wars
    wd:Q202161    # Gallic Wars
    wd:Q933963    # Marcomannic Wars
    wd:Q4205368   # Jewish-Roman wars

    # Reforms and major political/religious events
    wd:Q75207     # Pax Romana
    wd:Q312584    # Constitutio Antoniniana
    wd:Q180764    # Edict of Milan
    wd:Q1265674   # Diocletianic Persecution
  }

  OPTIONAL { ?event schema:description ?description FILTER(LANG(?description) = "en") }
  OPTIONAL { ?event wdt:P585 ?pointInTime }
  OPTIONAL { ?event wdt:P580 ?startTime }
  OPTIONAL { ?event wdt:P571 ?inception }
  BIND(COALESCE(?pointInTime, ?startTime, ?inception) AS ?date)
  OPTIONAL { ?event wdt:P625 ?coord }

  SERVICE wikibase:label {
    bd:serviceParam wikibase:language "en".
  }
}
`;
