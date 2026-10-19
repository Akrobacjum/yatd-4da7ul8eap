# usage: calib101.py NAME REPS [page]  -> runs the recorded runs on test/<page>.html, writes s101/c_NAME_<tag>.txt, prints a table
import sys, json, subprocess, os, re
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
NAME, REPS = sys.argv[1], sys.argv[2]; PAGE = sys.argv[3] if len(sys.argv) > 3 else 'page15'
reps = json.loads(sys.argv[4]) if len(sys.argv) > 4 else []
if reps:
    src = open(SC + 'test/%s.html' % PAGE, encoding='utf-8').read()
    for a, b in reps:
        assert src.count(a) == 1, ('not found once', a[:80], src.count(a))
        src = src.replace(a, b)
    PAGE = 'pc101_' + NAME
    open(SC + 'test/%s.html' % PAGE, 'w', encoding='utf-8').write(src)
os.makedirs(SC + 's101', exist_ok=True)
runs = [('kill', 'mve2n6herdwo', '1,2,3,4,5,6,7,8,9,10', 'real11'), ('fear', 'mve3x2sd0u19', '1,2,3,4,5,6,7,8,9,10', 'real11'),
        ('fire', 'mve5sxkkz2lz', '1,2,3,4,5,6,7', 'real11'), ('v12', 'mvegu84ofp6d', '1,2,3,4,5,6,7', 'real12'), ('v13', 'mvela3w4xin1', '1,2,3,4,5,6', 'real13'),
        ('v14', 'mvenqjt9v35t', '1,2,3,4,5', 'real14'), ('p10', 'mvezc5vnbi3e', '1,2,3,4,5,6,7,8,9,10', 'real15')]
only = os.environ.get('ONLY')
if only: runs = [r for r in runs if r[0] in only.split(',')]
procs = []
WMAX = int(os.environ.get('WMAX', '99'))
for tag, rid, waves, docs in runs:
    waves = ','.join(w for w in waves.split(',') if int(w) <= WMAX)
    out = open(SC + 's101/c_%s_%s.txt' % (NAME, tag), 'w')
    env = os.environ.copy(); env['DOCS'] = docs
    procs.append((tag, out, subprocess.Popen(['python3', SC + 'test/replay101.py', PAGE, rid, waves, REPS, 'v12'], stdout=out, stderr=subprocess.STDOUT, env=env)))
for tag, out, p in procs: p.wait(); out.close()
for tag, _, _ in procs:
    rows = []
    for l in open(SC + 's101/c_%s_%s.txt' % (NAME, tag)):
        if l.startswith('JSON '): rows.append(json.loads(l[5:]))
        if l.startswith('errs') and l.strip() != 'errs []': print(tag, l.strip()[:300])
    print(NAME, tag, ' '.join('W%d:%s/%s med%d need%d fed%d/%d t%d c%d' % (r['w'], r['lost'], r['reps'], r['pts'][len(r['pts'])//2], r['need'], r['fedN'], r['reps'], r['t'][len(r['t'])//2], r['combo']) for r in rows))
