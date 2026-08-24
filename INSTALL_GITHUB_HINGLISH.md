# Kapoore Art Talking Clock — GitHub Se Install Karne Ki Guide
### (Non-Technical logon ke liye, Hinglish mein)

Is guide mein hum 2 kaam karenge:
1. **App ka "front" (jo dikhta hai)** — GitHub Pages par daalenge (bilkul FREE, koi coding nahi)
2. **App ka "backend" (license aur payment ka system)** — Render.com par daalenge (ye bhi FREE hai)

Dono kaam sirf **mouse click karke** ho jayenge — koi command line ya coding nahi karni.

---

## PART 1 — GitHub Account Banao (5 min)

1. Apne phone/computer ke browser mein jao: **github.com**
2. Top-right corner mein **"Sign up"** button dabao
3. Apna email, password, aur username daalo
4. Email verify karo (GitHub apko email bhejega — us par click karo)
5. Ho gaya — ab aapka GitHub account ready hai

---

## PART 2 — Naya Repository (Folder) Banao

1. GitHub mein login karke, top-right corner mein **"+"** icon dabao
2. **"New repository"** select karo
3. Repository ka naam daalo: `kapoore-talking-clock`
4. **"Public"** select rakho (Private mat karo, warna free website nahi banegi)
5. Neeche **"Create repository"** button dabao

---

## PART 3 — App Ki Files Upload Karo

1. Jo `kapoore-talking-clock.zip` file aapko di gayi hai, usse pehle **apne computer/phone mein extract (unzip)** kar lo
   - Andar 2 cheezein milengi: kuch files (jaise `index.html`, `style.css` waghera) aur ek `backend` folder
2. Apni GitHub repository ke page par jao
3. Beech mein likha **"uploading an existing file"** link par click karo
   *(Agar wo link nahi dikhe, to page ke upar **"Add file" → "Upload files"** button dabao)*
4. Ab apne computer se **sirf ye files/folders drag-and-drop karo** (backend folder ke andar wali files ko chhod do, wo Part 5 mein alag se upload karenge):
   - `index.html`
   - `style.css`
   - `app.js`
   - `config.js`
   - `manifest.webmanifest`
   - `service-worker.js`
   - `icons` (poora folder)
   - `README.md`
5. Neeche jaake **"Commit changes"** button dabao (green button)
6. Ho gaya — aapki app ki files ab GitHub par hain

---

## PART 4 — Website Ko Live Karo (GitHub Pages)

1. Apni repository ke andar, top mein **"Settings"** tab par click karo
2. Left side mein **"Pages"** option dhundo aur click karo
3. **"Branch"** ke neeche dropdown mein **"main"** select karo, aur folder **"/ (root)"** rehne do
4. **"Save"** button dabao
5. 1-2 minute wait karo, phir wahi page refresh karo
6. Upar ek link dikhega jaisa: `https://aapka-username.github.io/kapoore-talking-clock/`
7. **Ye link hi aapki live website hai** — isse kisi ko bhi bhej sakte ho

> ⚠️ Abhi tak license/payment/trial ka backend connect nahi hua hai, isliye trial ka status sahi se track nahi hoga. Wo Part 5-6 mein karenge.

---

## PART 5 — Backend (License + Payment System) Online Karo

Ye part thoda alag hai kyunki backend ko "hamesha chalne wale" server ki zaroorat hai. Iske liye **Render.com** use karenge (free hai, mouse-click se hota hai).

1. Browser mein jao: **render.com**
2. **"Get Started"** ya **"Sign Up"** dabao — GitHub account se hi sign up kar sakte ho (easy hoga)
3. Login hone ke baad, dashboard mein **"New +"** button dabao → **"Web Service"** select karo
4. Render aapse aapki GitHub repository connect karne ko kahega — **"kapoore-talking-clock"** wali repo choose karo
5. Ab ek form khulega, isme ye bharo:
   - **Name**: `kapoore-license-backend` (ya koi bhi naam)
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
6. Neeche **"Environment Variables"** section mein ye values add karo (Add Environment Variable dabao har ek ke liye):

   | Key | Value |
   |---|---|
   | `LICENSE_API_URL` | Apka Google Apps Script wala license system link |
   | `LICENSE_SECRET_KEY` | Apki secret key (License system se milegi) |
   | `ADMIN_KEY` | Koi bhi password aap khud banao — ye admin panel ke liye hai |
   | `APP_DOMAIN` | Aapka GitHub Pages wala link (Part 4 se), jaise `aapka-username.github.io` |
   | `CORS_ORIGIN` | Same GitHub Pages link, jaise `https://aapka-username.github.io` |

7. Sabse neeche **"Create Web Service"** button dabao
8. Render 2-3 minute mein aapka backend build aur start kar dega
9. Jab ho jaye, upar ek link milega jaisa: `https://kapoore-license-backend.onrender.com`
   — **is link ko copy kar lo**, agla step mein chahiye hoga

---

## PART 6 — Frontend Ko Backend Se Jodo

1. Wapas apni GitHub repository par jao
2. `config.js` file par click karo
3. Right side mein **pencil (edit) icon** dabao
4. Is line ko dhundo:
   ```
   backendApiUrl: "/api",
   ```
5. Isse badal kar apna Render wala link daalo (uske aage `/api` lagana mat bhoolna):
   ```
   backendApiUrl: "https://kapoore-license-backend.onrender.com/api",
   ```
6. Neeche **"Commit changes"** dabao
7. 1 minute wait karo — GitHub Pages apne aap update ho jayegi

Ab aapki website (Part 4 wala link) aur backend (Part 5 wala link) aapas mein connected hain. Trial, license, aur payment sab kaam karega.

---

## PART 7 — Phone Par App Install Karo (Test Karne Ke Liye)

### Android (Chrome browser):
1. Apni website ka link (Part 4 wala) Chrome mein kholo
2. Neeche/upar ek banner aayega **"Install Talking Clock"** — usme **"Install App"** dabao
3. Ya phir Chrome ke 3-dot menu (⋮) mein **"Install app"** option milega
4. App aapke phone ke home screen par icon ki tarah aa jayegi — bilkul normal app jaisi khulegi

### iPhone (Safari browser):
1. Website ka link Safari mein kholo
2. Neeche **Share icon** (box mein upar arrow ⬆️) dabao
3. **"Add to Home Screen"** option select karo
4. **"Add"** dabao — App icon home screen par aa jayega

---

## PART 8 — Admin Panel (Payment Verify Karne Ke Liye)

1. Apna Render wala backend link browser mein kholo aur uske aage `/admin` lagao:
   ```
   https://kapoore-license-backend.onrender.com/admin
   ```
2. Jo Admin Key Part 5 mein banayi thi, wo yahan daalo
3. **"Load Receipts"** dabao — jitne bhi customers ne payment receipt upload ki hai, sab dikhengi
4. Receipt kholo, payment check karo
5. Sahi hone par **"Verify & Generate License"** button dabao — ek license code milega
6. Wo code customer ko bhejo (agar unhone email di thi to automatically bhi chala jayega)

---

## Zaroori Baatein (Important)

- ⚠️ **`ADMIN_KEY` aur `LICENSE_SECRET_KEY` kisi ke saath share mat karo** — ye password jaisi cheezein hain
- Render ki FREE service thodi der (15 min) use na hone par so jaati hai — pehli request thodi slow (10-20 sec) ho sakti hai, phir normal ho jaati hai
- Agar future mein files mein koi change karna ho, GitHub par jaake file edit karo aur "Commit changes" dabao — website apne aap update ho jayegi
- HTTPS (secure lock 🔒) GitHub Pages aur Render dono khud-ba-khud laga dete hain, kuch alag se karne ki zaroorat nahi

---

## Kuch Gadbad Ho Jaye To

| Problem | Solution |
|---|---|
| Website nahi khul rahi | Part 4 dobara check karo, 1-2 min aur wait karo |
| "Install App" button nahi dikh raha | Kuch browsers 5-10 second baad hi ye button dikhate hain, thoda wait karo |
| Trial/License kaam nahi kar raha | Part 6 mein `backendApiUrl` sahi se daala hai ya nahi check karo |
| Admin panel nahi khul raha | Render link ke aage `/admin` lagaya hai ya nahi check karo |
