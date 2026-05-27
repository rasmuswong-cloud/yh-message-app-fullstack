# Inlämning 1 - Planeringsfasen
Vi har gjort en säkerhetsgranskning av YH Message App med hjälp av hotmodellering. Det betyder att vi försöker hitta risker i systemet innan någon angripare gör det — ungefär som att tänka som en tjuv för att kunna bygga bättre lås.

Först gick vi igenom vad hotmodellering är:

förstå systemet, tänka igenom vad som kan gå fel, bestämma hur vi skyddar oss och senare kontrollera att lösningarna fungerar

Vi beskrev sedan systemarkitekturen: webbläsare → frontend → server → databas.
Varje del är en möjlig angreppspunkt.

Med STRIDE‑modellen såg vi vilka typer av hot som finns, som spoofing, datamanipulation, dataläckor och överbelastning.
Med ESTRID‑modellen såg vi var hoten är störst — i övergångarna mellan zonerna, där servern och databasen är mest skyddsvärda.

Utifrån detta tog vi fram fyra enkla säkerhetskrav:

1. Automatisk utloggning

2. Starka och säkert sparade lösenord

3. Rate limiting för att stoppa brute force

4. Endast inloggade användare får göra något

Tillsammans ger detta en tydlig säkerhetsgrund inför nästa steg: kodgranskning och säkerhetstestning.