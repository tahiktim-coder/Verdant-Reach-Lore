import pathlib
here = pathlib.Path(__file__).parent
(here / 'muster.html').write_text((here / 'shell.html').read_text().replace('/*__GAME__*/', (here / 'muster.js').read_text()))
print('built muster.html')
