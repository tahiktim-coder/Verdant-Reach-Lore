import pathlib
h = pathlib.Path(__file__).parent
(h / 'reach-field-tips.html').write_text((h / 'shell.html').read_text().replace('/*__GAME__*/', (h / 'tips.js').read_text()))
print('built reach-field-tips.html')
