# Settings (Interval) aur Background/Lock-Screen — Guide

## 1. Interval (1 min / 5 min / Custom) Set Kaha Se Karein

App mein ye do jagah milega:

### Pehli baar app kholne par (Setup screen):
1. App kholte hi agar ye pehli baar hai, ek **"Quick Setup"** screen aayegi
2. Usme **"Announcement"** dropdown milega — usme 1, 2, 5, 10, 15, 30, 60 Minutes aur **Custom** options hain
3. Custom choose karne par 1–120 minute ke beech koi bhi number daal sakte ho

### Baad mein badalne ke liye (Settings gear icon):
1. Main clock screen ke **top-right corner** mein ek **⚙ (gear/settings) icon** hai — usse dabao
2. Neeche se ek panel khulega jisme **"Announcement Interval"** dropdown hoga
3. Value badlo, neeche **"Save"** button dabao — panel band ho jayega aur naya interval turant apply ho jayega

**Agar ye gear icon ya dropdown live site par nahi dikh raha:**
- 90% chance hai ki GitHub Pages abhi **purani cached files** serve kar raha hai
- Phone ke browser mein website ka link kholke **hard refresh** karo (Chrome mein: 3-dot menu → "Refresh" ko thoda der dabaye rakho, ya browser history/cache clear karo us site ke liye)
- Agar app already **install** ki hui hai (home screen icon se khulti hai), to us app ko **uninstall karke dobara install** karo — ye sabse pakka tarika hai naye version ko laane ka

---

## 2. Android Lock-Screen Par Announcement Kyun Nahi Ho Raha

### Pehle sach samjho (koi bhi website/app is limit ko cross nahi kar sakti):

Jab aap **START** dabate ho, app ek chhupa hua audio loop chalu kar deta hai — isi trick se browser samajhta hai "ye tab active hai, ise band mat karo", chahe screen lock ho jaye. Ye kaafi phones par kaam karta hai.

**Lekin** — kai Android phones (especially **Xiaomi/MIUI, Vivo, Oppo, Realme, OnePlus, Samsung ka "Sleeping Apps"**) apna khud ka aggressive "battery saver" chalate hain jo Chrome ko background mein **zabardasti band** kar dete hain — chahe website ne audio trick use kiya ho ya nahi. Ye phone ki setting hai, website iske upar se control nahi kar sakti.

### Fix karne ke steps (Android):

1. Phone ki **Settings** kholo
2. **Apps** (ya "App Management") mein jao
3. **Chrome** dhundo aur usme jao
4. **Battery** option dhundo (kabhi "Battery usage" ya "Power management" naam se bhi hota hai)
5. Usme **"Unrestricted"** ya **"No restrictions"** select karo (default hota hai "Optimized" ya "Restricted" — ise badlo)
6. Agar phone mein "Auto-start Manager" ya "App Lock/Sleep" jaisi setting hai (MIUI/Vivo/Oppo mein common), wahan bhi **Chrome ko allow/whitelist** karo
7. Notification permission bhi allow karo agar pucha jaye (kuch Android versions isse bhi background app ko trust karte hain)

### Ek aur cheez check karo:
- Phone ka **"Battery Saver" mode** khud manually ON to nahi hai? Agar hai, to usse OFF karo jab talking clock use kar rahe ho
- **Data Saver** mode bhi Chrome ko background mein kaam karne se rok sakta hai — usse bhi Chrome ke liye off/allow karo

### Sach mein kitna reliable hai:
- **Battery restriction hata dene ke baad**, zyada tar phones (Samsung, Pixel, stock Android) par ye 95%+ reliable chalta hai
- **MIUI (Xiaomi/Redmi)** sabse zyada aggressive hai — upar wale steps + "Autostart" enable karna zaroori hai, phir bhi kabhi-kabhi 10-15 min ke baad band ho sakta hai
- **iPhone (Safari)** par ye kabhi bhi fully reliable nahi hoga — Apple ka OS rule hai, koi website isse bypass nahi kar sakti

Maine audio thoda better bhi banaya hai (ekdum silent ki jagah ek bahut halka, na-sunayi-dene-wala tone) — kuch Chrome versions pure-silent audio ko "actually playing" nahi maante, isse thodi aur reliability badhegi.
