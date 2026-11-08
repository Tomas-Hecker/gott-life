# Bücher von Tomas Hecker

Website zu den Büchern „Bis er es findet“ und „Darf ich dein Herz entzünden?“:
HTML mit einer `style.css` und einem kleinen eigenen Skript zum Blättern (`lesen.js`), keine Cookies, nichts von fremden Servern.

## Seiten

- `index.html`: Startseite mit beiden Büchern, Perle, Angeboten für Gemeinden, Über Tomas
- `bis-er-es-findet/`: das neue Buch, dazu `vorwort.html` als Leseprobe
- `darf-ich-dein-herz-entzuenden/`: das erste Buch mit drei Gedichten und Bestellung,
  in `text/` das ganze Buch als Text (eine Seite je Gedicht oder Text),
  `lesen.html` zum Blättern (Seiten als Vektorgrafik in `seiten/`, mit Links) und das PDF mit Links und Lesezeichen
- `hilfe.html`, `impressum.html`, `datenschutz.html`
- `fonts/` (EB Garamond, Inter; SIL Open Font License), `img/` (Umschläge), `favicon.svg`

## Veröffentlichen mit GitHub Pages

GitHub Pages veröffentlicht die Seite aus dem Branch `gh-pages`, Ordner `/ (root)`.
`main` und `gh-pages` tragen denselben Stand, Änderungen gehen in beide. Die Datei `.nojekyll`
sorgt dafür, dass GitHub die Dateien unverändert ausliefert. Eine eigene Adresse steht in einer
Datei `CNAME` im Hauptordner oder unter Settings → Pages bei „Custom domain“.
