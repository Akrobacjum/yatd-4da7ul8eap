# 1.13.2 (author's run mvh4wnpcy54a, wave 7: the party got stuck in a dead-end strip of the crypt by the door, shuffling one
# tile back and forth single file for the whole raid): the wave is replayed from its saved document (real113/w7.json);
# the party may loot the strip, rest or prepare at the door, but never spends most of the raid around the crypt.
import asyncio, json, subprocess, sys
r = subprocess.run([sys.executable, 'e111/stuck_repro.py', sys.argv[1] if len(sys.argv) > 1 else 'page15', '8'], capture_output=True, text=True, cwd='/tmp/claude-0/-home-claude/fb891867-3494-5a36-92d3-9beb0ec01e2f/scratchpad')
reps = [l for l in r.stdout.splitlines() if l.startswith('rep ')]
crypt = [float(l.split('crypt ')[1].split()[0]) for l in reps]
print(json.dumps({'crypt': crypt, 'err': r.stderr[-300:] if r.returncode else ''}))
fails = []
if len(crypt) < 8: fails.append('replay did not run')
if any(c > 90 for c in crypt): fails.append('a raid stuck around the crypt: %s s' % max(crypt))
print('FAILS', fails)
