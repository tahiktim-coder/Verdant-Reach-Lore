# Joins src/shell.html and src/reachbound.js into one self-contained page.
import pathlib
here = pathlib.Path(__file__).parent
html = (here / 'src/shell.html').read_text().replace('/*__GAME__*/', (here / 'src/reachbound.js').read_text())
(here / 'reachbound-muster.html').write_text(html)
print('built reachbound-muster.html')
