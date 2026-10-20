# 1.13.4 (tester's run mvh8nl1a0g9d, wave 2: a thief who led the party stepped between two tiles in front of an arrow trap,
# shot from 55 to 10 HP): the same layout and party, played 6 times with the check model; no hero may spend 6 s stepping
# between 2 tiles while walking (it happened in 9 of 20 tries before), and the thief does disarm wall traps there.
import subprocess, sys, re
SC = '/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad/'
out = subprocess.run([sys.executable, SC + 'e1133/dither.py', 'page15', '6', SC + 'tests_data/waves_mvh8nl1a0g9d_02_part.json'], capture_output=True, text=True, timeout=900).stdout
print(out)
fails = []
m = re.search(r'dither total ([\d.]+)', out)
if not m: fails.append('no result')
elif float(m.group(1)) > 0: fails.append('heroes stepped back and forth for %s s' % m.group(1))
if 'errs []' not in out: fails.append('page errors')
print('FAILS', fails)
