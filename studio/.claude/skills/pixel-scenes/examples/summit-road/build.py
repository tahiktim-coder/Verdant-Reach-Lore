import pathlib
here = pathlib.Path(__file__).parent
(here / 'summit-road.html').write_text((here / 'shell.html').read_text().replace('/*__GAME__*/', (here / 'summit.js').read_text()))
print('built summit-road.html')
