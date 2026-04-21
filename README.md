# Forthright Events Management — Website

Static HTML/CSS/JS site with Supabase as the backend.
Events are stored in a Supabase database and update live on the site.
Admin panel is secured by Supabase Auth — no JS tricks.

## File Structure

```
forthright/
├── index.html              <- Public website
├── admin/
│   └── index.html          <- Admin CMS (requires Supabase login)
├── css/
│   ├── style.css
│   └── admin.css
├── js/
│   ├── supabase-config.js  <- Supabase URL + anon key
│   ├── main.js
│   └── admin.js
└── supabase-setup.sql      <- Run once in Supabase SQL Editor
```

## First-time Setup

1. Run supabase-setup.sql in Supabase SQL Editor
2. Create your admin user: Authentication -> Users -> Add user
3. Upload files to GitHub, enable GitHub Pages
4. Add custom domain in Settings -> Pages -> Custom domain

## Managing Events

Go to yourdomain.com/admin/ and log in with your Supabase Auth credentials.
Changes go live instantly — no file downloads or commits needed.
