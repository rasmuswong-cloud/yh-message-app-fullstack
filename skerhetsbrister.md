# Säkerhetsbrister och åtgärdsförslag

I granskningsfasen använde vi GitHubs säkerhetsverktyg **CodeQL** och **Dependabot** för att undersöka vår applikation.

- **CodeQL** analyserar vår egen kod och letar efter osäkra lösningar.
- **Dependabot** analyserar våra externa npm-paket och varnar om kända sårbarheter.

Syftet med granskningen var att identifiera säkerhetsbrister, förstå varför de är risker och föreslå rimliga åtgärder.

##Sammanfattning av viktigaste fynd**

De viktigaste fynden var:

- Backend saknar **rate limiting** på flera API-endpoints.
- Backend har en för generös **CORS-konfiguration**.
- Flera externa npm-paket har kända sårbarheter, bland annat `jsonwebtoken`, `node-tar`, `tar`, `qs`, `vite` och `esbuild`.

Alla sårbarheter betyder inte automatiskt att applikationen kan hackas direkt, men de visar vilka delar som behöver förbättras.

## CodeQL: brister i vår egen kod

### 1. För generös CORS-konfiguration

**Fil:** `backend/server.js`  
**Risknivå:** Medium  
**Plats:** omkring rad 28

CORS styr vilka webbplatser som får göra anrop till vårt API från en webbläsare. CodeQL hittade att vår CORS-konfiguration är för öppen.

Om CORS är för generöst inställt kan backend acceptera anrop från fler domäner än nödvändigt. Det är en säkerhetsrisk eftersom API:et bör vara begränsat till vår egen frontend och eventuella godkända domäner.

**Koppling till OWASP:**  
Detta kopplas främst till **OWASP A05: Security Misconfiguration**, eftersom applikationen är konfigurerad på ett för öppet sätt.

**Åtgärdsförslag:**

- Begränsa CORS till endast vår frontend, till exempel `http://localhost:5173` i utveckling.
- Använd miljövariabler för tillåtna domäner i produktion.
- Undvik att tillåta alla origins med `*`.

### 2. Saknad rate limiting

**Fil:** `backend/server.js`  
**Risknivå:** High  
**Plats:** flera endpoints, bland annat omkring rad 46, 163, 182, 194 och 222

Rate limiting betyder att man begränsar hur många requests en användare eller IP-adress får göra under en viss tid.

CodeQL hittade att flera endpoints saknar rate limiting. Det innebär att en angripare kan skicka väldigt många requests mot API:et. Det kan användas för att överbelasta servern, spamma funktioner eller försöka brute force:a känsliga delar som inloggning.

**Koppling till OWASP:**  
Detta kan kopplas till **OWASP A07: Identification and Authentication Failures** om det gäller inloggning, och även **OWASP A04: Insecure Design** eftersom applikationen saknar skydd mot missbruk.

**Åtgärdsförslag:**

- Lägg till rate limiting med exempelvis paketet `express-rate-limit`.
- Ha extra strikt rate limiting på inloggning och registrering.
- Returnera ett tydligt felmeddelande, till exempel HTTP-status `429 Too Many Requests`, när gränsen nås.

## Dependabot: sårbarheter i externa paket

Dependabot hittade sårbarheter i både backendens och frontendens beroenden. Dessa problem finns inte direkt i vår egen kod, utan i paket som projektet använder.

Den vanligaste åtgärden är att uppdatera paketen till säkrare versioner.

## Backend-beroenden

### 1. `jsonwebtoken`

**Risknivå:** High / Moderate

`jsonwebtoken` används för att skapa och verifiera JWT-tokens. JWT används ofta för inloggning och autentisering.

Dependabot hittade flera sårbarheter som rör hur tokens verifieras och vilka algoritmer eller nycklar som accepteras. Om tokenhantering görs fel kan en angripare i värsta fall försöka skapa eller manipulera tokens.

**Koppling till OWASP:**  
Detta kopplas främst till **OWASP A07: Identification and Authentication Failures**, eftersom det handlar om autentisering.

**Åtgärdsförslag:**

- Uppdatera `jsonwebtoken` till en säker version.
- Ange tydligt vilka algoritmer som får användas vid verifiering.
- Kontrollera att hemliga nycklar lagras säkert i miljövariabler och inte direkt i koden.

### 2. `node-tar` och `tar`

**Risknivå:** High

`node-tar` och `tar` används för att hantera arkivfiler. Dependabot hittade flera sårbarheter som handlar om path traversal, symlinks och filöverskrivning.

Path traversal betyder att en fil kan försöka hamna utanför den tänkta mappen, till exempel genom sökvägar som `../`. I värsta fall kan detta leda till att filer skrivs över eller skapas på fel plats.

**Koppling till OWASP:**  
Detta kan kopplas till **OWASP A01: Broken Access Control**, eftersom filer kan hamna utanför det område som applikationen borde tillåta.

**Åtgärdsförslag:**

- Uppdatera `node-tar` och `tar` till säkra versioner.
- Undvik att packa upp okända eller användaruppladdade arkiv utan kontroll.
- Kontrollera sökvägar vid filhantering så att filer inte kan hamna utanför tillåten mapp.

### 3. `qs`

**Risknivå:** Moderate

`qs` används för att tolka query strings och objekt från URL:er eller requests.

Sårbarheten handlar om att en angripare kan skicka väldigt komplexa eller stora query strings som gör att servern arbetar onödigt mycket. Det kan leda till en DoS-risk, alltså att servern blir långsam eller otillgänglig.

**Koppling till OWASP:**  
Detta kan kopplas till **OWASP A04: Insecure Design**, eftersom applikationen behöver skydd mot requests som kan överbelasta servern.

**Åtgärdsförslag:**

- Uppdatera `qs` till en säker version.
- Begränsa storlek och komplexitet på inkommande requests.
- Kombinera detta med rate limiting.

## Frontend-beroenden

### 1. `vite`

**Risknivå:** Low / Moderate

Vite används som utvecklingsserver och byggverktyg för frontend.

Dependabot hittade sårbarheter som kan göra att utvecklingsservern serverar filer på ett osäkert sätt eller kringgår vissa filbegränsningar. Detta är främst relevant i utvecklingsmiljö, men bör ändå åtgärdas.

**Koppling till OWASP:**  
Detta kopplas främst till **OWASP A05: Security Misconfiguration**.

**Åtgärdsförslag:**

- Uppdatera Vite till en säker version.
- Undvik att exponera utvecklingsservern publikt.
- Kontrollera att endast nödvändiga filer finns i frontendens `public`-mapp.

### 2. `launch-editor`

**Risknivå:** High

`launch-editor` används av utvecklingsverktyg för att kunna öppna en fil i en editor från webbläsaren.

Sårbarheten handlar om command injection på Windows. Det betyder att en angripare i vissa fall kan försöka få systemet att köra ett kommando som inte var tänkt.

Detta gäller främst utvecklingsmiljö och inte den färdiga produktionsappen.

**Koppling till OWASP:**  
Detta kan kopplas till **OWASP A03: Injection**, eftersom problemet handlar om att osäker input kan påverka kommandon.

**Åtgärdsförslag:**

- Uppdatera paketet via Vite eller andra beroenden som använder det.
- Kör inte utvecklingsservern öppet mot internet.
- Håll utvecklingsverktyg uppdaterade.

### 3. `esbuild`

**Risknivå:** Moderate

`esbuild` används för att bygga och optimera frontend-kod.

Sårbarheten handlar om att andra webbplatser i vissa fall kan skicka requests till utvecklingsservern och läsa svar. Detta gäller främst när utvecklingsservern körs.

**Koppling till OWASP:**  
Detta kopplas främst till **OWASP A05: Security Misconfiguration**.

**Åtgärdsförslag:**

- Uppdatera `esbuild` till en säker version.
- Se till att utvecklingsservern bara körs lokalt.
- Exponera inte utvecklingsservern publikt.

## Prioriterade åtgärder

Vi bedömer att följande åtgärder bör prioriteras:

1. Lägg till rate limiting på känsliga backend-endpoints.
2. Begränsa CORS till godkända frontend-domäner.
3. Uppdatera sårbara npm-paket i backend och frontend.
4. Kontrollera att JWT används säkert med rätt algoritm och säkra hemligheter.
5. Fortsätt använda CodeQL och Dependabot i GitHub för att upptäcka nya problem.

## Slutsats

Granskningen visar att applikationen har några tydliga säkerhetsbrister, men att de är vanliga och möjliga att åtgärda.

De viktigaste problemen finns i backendens skydd mot missbruk, särskilt saknad rate limiting och för öppen CORS. Dependabot visar också att flera externa paket behöver uppdateras.

Vår slutsats är att applikationen kan bli betydligt säkrare genom relativt enkla åtgärder: begränsa CORS, lägga till rate limiting och hålla beroenden uppdaterade.
