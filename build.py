import pathlib
root = pathlib.Path(__file__).parent
html = (root/'index.html').read_text()
css = ''.join((root/'css'/f).read_text() for f in ['styles.css','labs.css'])
js = ''.join((root/'js'/f).read_text()+'\n' for f in ['core.js','hash.js','carvedata.js','home.js','foundations.js','disk.js','live.js','pages.js'])
js += "\nApp.start();\n"
html = html.replace('<!--CSS-->','<style>\n'+css+'\n</style>').replace('<!--JS-->','<script>\n'+js.replace('</script','<\\/script')+'\n</script>')
out = root/'dist'; out.mkdir(exist_ok=True)
(out/'index.html').write_text(html)
print(len(html),'bytes')
