# joins the three script parts into one self-contained page
import pathlib
here = pathlib.Path(__file__).parent
js = ''.join((here / f).read_text() for f in ['1_engine.js', '2_sim_render.js', '3_story_ui.js'])
(here / 'kolobok.html').write_text((here / 'shell.html').read_text().replace('/*__GAME__*/', js))
print('built kolobok.html')
